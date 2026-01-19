/**
 * Script de prueba para verificar que el endpoint API de transacciones
 * devuelva los datos correctos para cada empresa
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testTransactionsAPI() {
  console.log('🧪 Probando endpoint de transacciones...\n')

  try {
    const companies = await prisma.company.findMany({
      select: { id: true, name: true }
    })

    for (const company of companies) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`🏢 Empresa: ${company.name}`)
      console.log(`${'='.repeat(60)}`)

      // Simular consulta del API GET /api/transactions
      const where: any = { companyId: company.id }
      
      const transactions = await prisma.transaction.findMany({
        where,
        orderBy: [
          { date: 'desc' },
          { id: 'desc' }
        ],
        take: 1000
      })

      const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + (t.amount || 0), 0)
      const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + (t.amount || 0), 0)

      console.log(`\n📊 Resultado de la consulta API:`)
      console.log(`   Total transacciones: ${transactions.length}`)
      console.log(`   Total ingresos: $${income.toFixed(2)} (${transactions.filter(t => t.type === 'INCOME').length} transacciones)`)
      console.log(`   Total gastos: $${expense.toFixed(2)} (${transactions.filter(t => t.type === 'EXPENSE').length} transacciones)`)
      console.log(`   Balance: $${(income - expense).toFixed(2)}`)

      if (transactions.length > 0) {
        console.log(`\n📝 Primeras 5 transacciones:`)
        transactions.slice(0, 5).forEach((t, idx) => {
          console.log(`   ${idx + 1}. ${t.date.toISOString().split('T')[0]} | ${t.type.padEnd(8)} | $${t.amount?.toFixed(2).padStart(10)} | ${(t.description || '').substring(0, 40)}`)
        })
      }

      // Buscar las transacciones específicas mencionadas por el usuario
      if (company.name.toLowerCase().includes('leonardo')) {
        console.log(`\n🔍 Buscando transacciones específicas en Leonardo (422, 50, 20):`)
        const specific = transactions.filter(t => 
          t.amount === 422 || t.amount === 422.50 || 
          t.amount === 50 || t.amount === 50.00 ||
          t.amount === 20 || t.amount === 20.00
        )
        specific.forEach(t => {
          console.log(`   ✅ Encontrada: ${t.date.toISOString().split('T')[0]} | $${t.amount} | ${t.description} | ID: ${t.id}`)
        })
        
        if (specific.length === 0) {
          console.log(`   ❌ No se encontraron transacciones con esos montos exactos`)
          console.log(`\n   Buscando montos cercanos...`)
          const nearby = transactions.filter(t => 
            (t.amount >= 20 && t.amount <= 25) ||
            (t.amount >= 45 && t.amount <= 55) ||
            (t.amount >= 420 && t.amount <= 425)
          )
          nearby.forEach(t => {
            console.log(`   📍 Similar: ${t.date.toISOString().split('T')[0]} | $${t.amount} | ${t.description}`)
          })
        }
      }
    }

    console.log(`\n\n✅ Prueba completada`)

  } catch (error) {
    console.error('❌ Error en la prueba:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testTransactionsAPI()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
