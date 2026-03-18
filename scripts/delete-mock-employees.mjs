import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

// Get employee IDs first
const employees = await p.employee.findMany({
  where: { companyId: 'test-company-florida' },
  select: { id: true, firstName: true, lastName: true }
})
console.log('Empleados a eliminar:', employees.map(e => `${e.firstName} ${e.lastName}`))

const ids = employees.map(e => e.id)

// Delete dependent records in order
const timeEntries = await p.timeEntry.deleteMany({ where: { employeeId: { in: ids } } })
console.log('TimeEntries eliminados:', timeEntries.count)

const taxForms = await p.taxFormW2.deleteMany({ where: { employeeId: { in: ids } } })
console.log('TaxFormsW2 eliminados:', taxForms.count)

const expenses = await p.expense.deleteMany({ where: { employeeId: { in: ids } } })
console.log('Expenses eliminados:', expenses.count)

const runItems = await p.payrollRunItem.deleteMany({ where: { employeeId: { in: ids } } })
console.log('PayrollRunItems eliminados:', runItems.count)

const checks = await p.payrollCheck.deleteMany({ where: { employeeId: { in: ids } } })
console.log('PayrollChecks eliminados:', checks.count)

const payments = await p.payrollPayment.deleteMany({ where: { employeeId: { in: ids } } })
console.log('PayrollPayments eliminados:', payments.count)

const payrolls = await p.payroll.deleteMany({ where: { employeeId: { in: ids } } })
console.log('Payrolls eliminados:', payrolls.count)

// Delete employees
const result = await p.employee.deleteMany({ where: { id: { in: ids } } })
console.log('Empleados eliminados:', result.count)

await p.$disconnect()
