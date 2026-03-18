import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const [emp, te, co, tr, inv, cust] = await Promise.all([
  p.employee.count(),
  p.timeEntry.count(),
  p.company.count(),
  p.transaction.count(),
  p.invoice.count(),
  p.customer.count(),
])
console.log('Companies:', co)
console.log('Employees:', emp)
console.log('TimeEntries:', te)
console.log('Transactions:', tr)
console.log('Invoices:', inv)
console.log('Customers:', cust)
await p.$disconnect()
