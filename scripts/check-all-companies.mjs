import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const companies = [
  { name: 'Venecoro', id: 'cmjnfngxx00024yvszbcr5yf1' },
  { name: 'Leonardo', id: 'cmk6gn8f60001hps2qgnsamx0' },
  { name: 'Buckley asociacion', id: 'cml86av6y00019n0yasgnuq47' },
]

for (const company of companies) {
  const [tx, expenses, customers] = await Promise.all([
    p.transaction.count({ where: { companyId: company.id } }),
    p.expense.count({ where: { companyId: company.id } }),
    p.customer.count({ where: { companyId: company.id } }),
  ])

  const txSample = await p.transaction.findMany({
    where: { companyId: company.id },
    select: { type: true, amount: true, description: true, date: true },
    orderBy: { date: 'desc' },
    take: 3,
  })

  console.log(`\n=== ${company.name} ===`)
  console.log(`  Transacciones: ${tx}`)
  console.log(`  Gastos: ${expenses}`)
  console.log(`  Clientes: ${customers}`)
  if (txSample.length > 0) {
    console.log('  Últimas transacciones:')
    txSample.forEach(t => console.log(`    - ${t.type} | $${t.amount} | ${t.description?.slice(0, 40)} | ${t.date?.toISOString().split('T')[0]}`))
  }
}

await p.$disconnect()
