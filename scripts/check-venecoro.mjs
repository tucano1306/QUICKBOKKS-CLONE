import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const venecoro = 'cmjnfngxx00024yvszbcr5yf1'

const [transactions, expenses, invoices, customers, payrolls, journalEntries] = await Promise.all([
  p.transaction.findMany({ where: { companyId: venecoro }, select: { id: true, type: true, amount: true, description: true, date: true, category: true } }),
  p.expense.findMany({ where: { companyId: venecoro }, select: { id: true, amount: true, description: true, status: true, date: true } }),
  p.invoice.findMany({ where: { companyId: venecoro }, select: { id: true, total: true, status: true, invoiceNumber: true } }),
  p.customer.findMany({ where: { companyId: venecoro }, select: { id: true, name: true } }),
  p.payroll.findMany({ where: { companyId: venecoro }, select: { id: true, grossSalary: true, netSalary: true, status: true } }),
  p.journalEntry.findMany({ where: { companyId: venecoro }, select: { id: true, description: true, totalDebit: true, date: true } }).catch(() => []),
])

console.log('\n=== VENECORO (cmjnfngxx...) ===')
console.log(`Transacciones: ${transactions.length}`)
if (transactions.length > 0) {
  const income = transactions.filter(t => t.type === 'INCOME' || t.type === 'income' || t.amount > 0)
  const expense = transactions.filter(t => t.type === 'EXPENSE' || t.type === 'expense' || t.amount < 0)
  console.log('  Tipos únicos:', [...new Set(transactions.map(t => t.type))])
  console.log('  Muestra (primeras 5):')
  transactions.slice(0, 5).forEach(t => console.log(`    - ${t.type} | $${t.amount} | ${t.description?.slice(0,40)} | ${t.date?.toISOString().split('T')[0]}`))
}
console.log(`Gastos (Expense): ${expenses.length}`)
console.log(`Facturas (Invoice): ${invoices.length}`)
console.log(`Clientes: ${customers.length}`, customers.map(c => c.name))
console.log(`Nóminas: ${payrolls.length}`)
console.log(`Asientos contables: ${journalEntries.length}`)

// Check what pages/views exist
console.log('\n=== RESUMEN TOTAL DB ===')
const counts = await Promise.all([
  p.transaction.count(),
  p.expense.count(),
  p.invoice.count(),
  p.customer.count(),
  p.payroll.count(),
])
console.log(`Transacciones totales: ${counts[0]}`)
console.log(`Gastos totales: ${counts[1]}`)
console.log(`Facturas totales: ${counts[2]}`)
console.log(`Clientes totales: ${counts[3]}`)
console.log(`Nóminas totales: ${counts[4]}`)

await p.$disconnect()
