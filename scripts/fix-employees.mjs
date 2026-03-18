import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

// Show current state
const companies = await p.company.findMany({ select: { id: true, name: true } })
console.log('\nEmpresas disponibles:')
companies.forEach(c => console.log(`  ${c.name} → ${c.id}`))

// Show employees
const employees = await p.employee.findMany({ select: { id: true, firstName: true, lastName: true, companyId: true } })
console.log('\nEmpleados actuales:')
employees.forEach(e => console.log(`  ${e.firstName} ${e.lastName} → companyId: ${e.companyId}`))

console.log('\nPara reasignar empleados, ejecuta: node scripts/fix-employees.mjs <companyId>')
await p.$disconnect()
