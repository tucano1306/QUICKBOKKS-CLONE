/**
 * Script para verificar que las transacciones se estén filtrando correctamente por empresa
 * 
 * Este script verifica:
 * 1. Que las transacciones de cada empresa se almacenen correctamente con su companyId
 * 2. Que las consultas filtren correctamente por companyId
 * 3. Que no haya "bleeding" de datos entre empresas
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Verificando aislamiento de datos por empresa...\n')

  try {
    // 1. Obtener todas las empresas
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true
      }
    })

    console.log(`📊 Total de empresas encontradas: ${companies.length}\n`)

    for (const company of companies) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`🏢 Empresa: ${company.name} (ID: ${company.id})`)
      console.log(`${'='.repeat(60)}`)

      // Contar transacciones manualmente
      const transactionCount = await prisma.transaction.count({
        where: { companyId: company.id }
      })
      const invoiceCount = await prisma.invoice.count({
        where: { companyId: company.id }
      })
      const expenseCount = await prisma.expense.count({
        where: { companyId: company.id }
      })
      const bankTransactionCount = await prisma.bankTransaction.count({
        where: { companyId: company.id }
      })

      // Verificar transacciones
      const transactions = await prisma.transaction.findMany({
        where: { companyId: company.id },
        orderBy: [
          { date: 'desc' },
          { id: 'desc' }
        ],
        take: 10
      })

      console.log(`\n📝 Transacciones (últimas 10):`)
      console.log(`   Total: ${transactionCount}`)
      
      const incomeCountInTransactions = transactions.filter(t => t.type === 'INCOME').length
      const expenseCountInTransactions = transactions.filter(t => t.type === 'EXPENSE').length
      const incomeTotal = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + (t.amount || 0), 0)
      const expenseTotal = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + (t.amount || 0), 0)

      console.log(`   Ingresos: ${incomeCountInTransactions} transacciones ($${incomeTotal.toFixed(2)})`)
      console.log(`   Gastos: ${expenseCountInTransactions} transacciones ($${expenseTotal.toFixed(2)})`)

      if (transactions.length > 0) {
        console.log(`\n   Últimas transacciones:`)
        transactions.slice(0, 5).forEach(t => {
          console.log(`   - ${t.date.toISOString().split('T')[0]} | ${t.type.padEnd(8)} | $${t.amount?.toFixed(2).padStart(10)} | ${t.description || 'Sin descripción'}`)
        })
      }

      // Verificar facturas
      console.log(`\n📄 Facturas: ${invoiceCount}`)
      
      // Verificar gastos
      console.log(`💸 Gastos: ${expenseCount}`)
      
      // Verificar transacciones bancarias
      console.log(`🏦 Transacciones bancarias: ${bankTransactionCount}`)

      // Verificar que no haya "bleeding" de companyId
      const wrongCompanyTransactions = await prisma.transaction.count({
        where: {
          AND: [
            { companyId: { not: company.id } },
            { companyId: { not: null } }
          ]
        }
      })

      if (wrongCompanyTransactions > 0) {
        console.log(`\n⚠️  ADVERTENCIA: Se encontraron ${wrongCompanyTransactions} transacciones de otras empresas`)
      }
    }

    // Verificar transacciones sin companyId (huérfanas)
    const orphanTransactions = await prisma.transaction.count({
      where: { companyId: null }
    })

    if (orphanTransactions > 0) {
      console.log(`\n\n⚠️  ADVERTENCIA: ${orphanTransactions} transacciones sin companyId (huérfanas)`)
      
      const orphans = await prisma.transaction.findMany({
        where: { companyId: null },
        take: 5
      })
      
      console.log(`\nPrimeras 5 transacciones huérfanas:`)
      orphans.forEach(t => {
        console.log(`   - ${t.id} | ${t.date.toISOString().split('T')[0]} | ${t.type} | $${t.amount}`)
      })
    }

    console.log(`\n\n✅ Verificación completada exitosamente`)

  } catch (error) {
    console.error('❌ Error durante la verificación:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
