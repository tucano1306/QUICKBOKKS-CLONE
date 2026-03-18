import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const [companyUsers, expensesByCompany, txByCompany, expensesByUserId] = await Promise.all([
  p.companyUser.findMany({
    include: {
      company: { select: { name: true } },
      user: { select: { email: true, id: true } }
    }
  }),
  p.expense.groupBy({ by: ['companyId'], _count: true }),
  p.transaction.groupBy({ by: ['companyId'], _count: true }),
  p.expense.groupBy({ by: ['userId'], _count: true }),
])

console.log('\n=== CompanyUser (quién tiene acceso a qué empresa) ===')
companyUsers.forEach(r => console.log(`  ${r.user.email} (${r.user.id}) -> ${r.company.name} (${r.companyId}) | rol: ${r.role}`))

console.log('\n=== Gastos por companyId ===')
expensesByCompany.forEach(r => console.log(`  companyId: ${r.companyId} | gastos: ${r._count}`))

console.log('\n=== Gastos por userId (los que no tienen companyId) ===')
expensesByUserId.forEach(r => console.log(`  userId: ${r.userId} | gastos: ${r._count}`))

console.log('\n=== Transacciones por companyId ===')
txByCompany.forEach(r => console.log(`  companyId: ${r.companyId} | tx: ${r._count}`))

// Check if any expense has null companyId
const nullCompanyExpenses = await p.expense.count({ where: { companyId: null } })
console.log(`\nGastos con companyId NULL: ${nullCompanyExpenses}`)

await p.$disconnect()
