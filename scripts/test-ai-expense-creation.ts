/**
 * Script de prueba para verificar creación de múltiples gastos con AI
 * 
 * Uso:
 * npx ts-node scripts/test-ai-expense-creation.ts
 */

import { chatWithAgent, createAgentConversation } from '@/lib/ai-agent-service';
import { prisma } from '@/lib/prisma';

async function testMultipleExpenseCreation() {
  console.log('🧪 Iniciando prueba de creación múltiple de gastos...\n');

  // 1. Buscar un usuario y compañía de prueba
  const companyUser = await prisma.companyUser.findFirst({
    include: {
      user: true,
      company: true
    }
  });

  if (!companyUser) {
    console.error('❌ No se encontró ningún usuario con compañía asignada');
    console.log('💡 Ejecuta el seed primero: npm run db:seed');
    return;
  }

  console.log(`✅ Usuario encontrado: ${companyUser.user.email}`);
  console.log(`✅ Compañía: ${companyUser.company.name}\n`);

  // 2. Crear conversación de prueba
  const conversationId = await createAgentConversation(
    companyUser.companyId,
    companyUser.userId,
    'Test de creación múltiple de gastos'
  );

  console.log(`✅ Conversación creada: ${conversationId}\n`);

  // 3. Probar la creación de 10 gastos
  const context = {
    conversationId,
    companyId: companyUser.companyId,
    userId: companyUser.userId,
    history: []
  };

  console.log('📝 Solicitando crear 10 gastos...\n');

  const message = 'Crea 10 gastos de $50.00 cada uno con el concepto "Material de oficina" y categoría "office"';

  try {
    const response = await chatWithAgent(context, message);

    console.log('\n📊 RESPUESTA DE LA IA:\n');
    console.log('Success:', response.success);
    console.log('Message:', response.message);
    
    if (response.actions) {
      console.log('\n🎬 ACCIONES EJECUTADAS:', response.actions.length);
      response.actions.forEach((action, i) => {
        console.log(`\n${i + 1}. ${action.type}`);
        console.log('   Descripción:', action.description);
        console.log('   Resultado:', action.result);
      });
    }

    if (response.data) {
      console.log('\n📦 DATA:', response.data);
    }

    // 4. Verificar gastos creados
    console.log('\n\n🔍 Verificando gastos en la base de datos...\n');

    const expenses = await prisma.expense.findMany({
      where: {
        companyId: companyUser.companyId,
        description: 'Material de oficina'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`✅ Gastos encontrados: ${expenses.length}`);
    
    if (expenses.length > 0) {
      console.log('\nÚltimos gastos creados:');
      expenses.forEach((expense, i) => {
        console.log(`${i + 1}. ID: ${expense.id} - $${expense.amount} - ${expense.description}`);
      });
    }

    // 5. Verificar journal entries
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        companyId: companyUser.companyId,
        reference: {
          in: expenses.map(e => e.id)
        }
      },
      include: {
        lines: true
      }
    });

    console.log(`\n✅ Asientos contables creados: ${journalEntries.length}`);

    if (journalEntries.length > 0) {
      console.log('\nPrimer asiento contable:');
      const je = journalEntries[0];
      console.log(`Número: ${je.entryNumber}`);
      console.log(`Descripción: ${je.description}`);
      console.log('Líneas:');
      je.lines.forEach(line => {
        console.log(`  - Débito: $${line.debit}, Crédito: $${line.credit} - ${line.description}`);
      });
    }

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }

  await prisma.$disconnect();
}

testMultipleExpenseCreation().catch(console.error);
