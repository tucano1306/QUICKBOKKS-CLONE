/**
 * SEED: Catálogo de Cuentas Contables Base
 * 
 * Ejecutar: npx tsx scripts/seed-chart-of-accounts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const COMPANY_ID = process.argv[2] || 'cmis3j65t000712d2bx4izgfy';

const ACCOUNTS = [
  // ============================================
  // ACTIVOS (1000-1999)
  // ============================================
  { code: '1000', name: 'Efectivo y Caja', type: 'ASSET', category: 'CURRENT_ASSET' },
  { code: '1100', name: 'Bancos', type: 'ASSET', category: 'CURRENT_ASSET' },
  { code: '1110', name: 'Banco Principal', type: 'ASSET', category: 'CURRENT_ASSET' },
  { code: '1200', name: 'Cuentas por Cobrar', type: 'ASSET', category: 'CURRENT_ASSET' },
  { code: '1210', name: 'Clientes', type: 'ASSET', category: 'CURRENT_ASSET' },
  { code: '1300', name: 'Inventario', type: 'ASSET', category: 'CURRENT_ASSET' },
  { code: '1400', name: 'Gastos Prepagados', type: 'ASSET', category: 'CURRENT_ASSET' },
  { code: '1500', name: 'Activos Fijos', type: 'ASSET', category: 'FIXED_ASSET' },
  { code: '1510', name: 'Mobiliario y Equipo', type: 'ASSET', category: 'FIXED_ASSET' },
  { code: '1520', name: 'Equipo de Computación', type: 'ASSET', category: 'FIXED_ASSET' },
  { code: '1530', name: 'Vehículos', type: 'ASSET', category: 'FIXED_ASSET' },
  { code: '1600', name: 'Depreciación Acumulada', type: 'ASSET', category: 'FIXED_ASSET' },
  
  // ============================================
  // PASIVOS (2000-2999)
  // ============================================
  { code: '2000', name: 'Cuentas por Pagar', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
  { code: '2010', name: 'Proveedores', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
  { code: '2100', name: 'Impuestos por Pagar', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
  { code: '2110', name: 'IVA por Pagar', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
  { code: '2120', name: 'Retenciones por Pagar', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
  { code: '2200', name: 'Salarios por Pagar', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
  { code: '2300', name: 'Préstamos a Corto Plazo', type: 'LIABILITY', category: 'CURRENT_LIABILITY' },
  { code: '2500', name: 'Préstamos a Largo Plazo', type: 'LIABILITY', category: 'LONG_TERM_LIABILITY' },
  
  // ============================================
  // PATRIMONIO (3000-3999)
  // ============================================
  { code: '3000', name: 'Capital Social', type: 'EQUITY', category: 'EQUITY' },
  { code: '3100', name: 'Utilidades Retenidas', type: 'EQUITY', category: 'EQUITY' },
  { code: '3200', name: 'Utilidad del Ejercicio', type: 'EQUITY', category: 'EQUITY' },
  { code: '3300', name: 'Reservas', type: 'EQUITY', category: 'EQUITY' },
  
  // ============================================
  // INGRESOS (4000-4999)
  // ============================================
  { code: '4000', name: 'Ingresos por Ventas', type: 'REVENUE', category: 'OPERATING_REVENUE' },
  { code: '4100', name: 'Ingresos por Servicios', type: 'REVENUE', category: 'OPERATING_REVENUE' },
  { code: '4200', name: 'Descuentos en Ventas', type: 'REVENUE', category: 'OPERATING_REVENUE' },
  { code: '4300', name: 'Devoluciones en Ventas', type: 'REVENUE', category: 'OPERATING_REVENUE' },
  { code: '4900', name: 'Otros Ingresos', type: 'REVENUE', category: 'NON_OPERATING_REVENUE' },
  
  // ============================================
  // GASTOS (5000-5999)
  // ============================================
  { code: '5000', name: 'Gastos Operativos', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
  { code: '5100', name: 'Gastos de Salarios', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
  { code: '5110', name: 'Sueldos y Salarios', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
  { code: '5120', name: 'Beneficios Sociales', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
  { code: '5200', name: 'Gastos de Alquiler', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
  { code: '5300', name: 'Servicios Públicos', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
  { code: '5310', name: 'Electricidad', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
  { code: '5320', name: 'Agua', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
  { code: '5330', name: 'Internet y Teléfono', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
  { code: '5400', name: 'Gastos de Oficina', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
  { code: '5500', name: 'Gastos de Depreciación', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
  { code: '5600', name: 'Gastos de Marketing', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
  { code: '5700', name: 'Gastos Financieros', type: 'EXPENSE', category: 'NON_OPERATING_EXPENSE' },
  { code: '5710', name: 'Intereses Bancarios', type: 'EXPENSE', category: 'NON_OPERATING_EXPENSE' },
  { code: '5720', name: 'Comisiones Bancarias', type: 'EXPENSE', category: 'NON_OPERATING_EXPENSE' },
  { code: '5800', name: 'Gastos de Viaje', type: 'EXPENSE', category: 'OPERATING_EXPENSE' },
  { code: '5900', name: 'Otros Gastos', type: 'EXPENSE', category: 'NON_OPERATING_EXPENSE' },
  
  // ============================================
  // COSTO DE VENTAS (6000-6999)
  // ============================================
  { code: '6000', name: 'Costo de Ventas', type: 'EXPENSE', category: 'COST_OF_GOODS_SOLD' },
  { code: '6100', name: 'Costo de Mercancía Vendida', type: 'EXPENSE', category: 'COST_OF_GOODS_SOLD' },
];

async function main() {
  console.log('═'.repeat(60));
  console.log('🌱 SEED: CATÁLOGO DE CUENTAS CONTABLES');
  console.log('═'.repeat(60));
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  console.log(`🏢 Company ID: ${COMPANY_ID}`);
  console.log('═'.repeat(60));
  
  // Verificar que la empresa existe
  const company = await prisma.company.findUnique({
    where: { id: COMPANY_ID }
  });
  
  if (!company) {
    console.log(`\n❌ Error: No se encontró la empresa ${COMPANY_ID}`);
    await prisma.$disconnect();
    process.exit(1);
  }
  
  console.log(`\n✅ Empresa encontrada: ${company.name}`);
  console.log(`\n📋 Creando ${ACCOUNTS.length} cuentas...\n`);
  
  let created = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const account of ACCOUNTS) {
    try {
      // Verificar si ya existe
      const existing = await prisma.chartOfAccounts.findFirst({
        where: {
          code: account.code,
          OR: [
            { companyId: COMPANY_ID },
            { companyId: null }
          ]
        }
      });
      
      if (existing) {
        console.log(`⏭️  ${account.code} - ${account.name} (ya existe)`);
        skipped++;
        continue;
      }
      
      await prisma.chartOfAccounts.create({
        data: {
          code: account.code,
          name: account.name,
          type: account.type as any,
          category: account.category as any,
          companyId: COMPANY_ID,
          isActive: true,
          level: 1,
          balance: 0
        }
      });
      
      console.log(`✅ ${account.code} - ${account.name}`);
      created++;
      
    } catch (error: any) {
      console.log(`❌ ${account.code} - Error: ${error.message}`);
      errors++;
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN');
  console.log('═'.repeat(60));
  console.log(`✅ Creadas: ${created}`);
  console.log(`⏭️  Existentes: ${skipped}`);
  console.log(`❌ Errores: ${errors}`);
  console.log('═'.repeat(60));
  
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
