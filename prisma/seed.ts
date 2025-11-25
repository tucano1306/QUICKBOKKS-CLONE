import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@quickbooks.com' },
    update: {},
    create: {
      email: 'admin@quickbooks.com',
      name: 'Administrador',
      password: hashedPassword,
      role: 'ADMIN',
      company: 'Mi Empresa S.A. de C.V.',
      phone: '55 1234 5678',
    },
  })

  console.log('✅ Usuario administrador creado:', adminUser.email)

  // Create expense categories
  const categories = [
    { name: 'Servicios Profesionales', type: 'OPERATING', description: 'Servicios profesionales y consultorías' },
    { name: 'Renta de Oficina', type: 'ADMINISTRATIVE', description: 'Renta de espacios de oficina' },
    { name: 'Marketing y Publicidad', type: 'SALES', description: 'Gastos en marketing y publicidad' },
    { name: 'Suministros de Oficina', type: 'ADMINISTRATIVE', description: 'Papelería y suministros' },
    { name: 'Servicios Públicos', type: 'ADMINISTRATIVE', description: 'Electricidad, agua, internet' },
    { name: 'Transporte', type: 'OPERATING', description: 'Gastos de transporte y gasolina' },
  ]

  for (const category of categories) {
    const existing = await prisma.expenseCategory.findFirst({
      where: { name: category.name },
    })
    
    if (!existing) {
      await prisma.expenseCategory.create({
        data: category as any,
      })
    }
  }

  console.log('✅ Categorías de gastos creadas')

  // Create sample customers
  const portalPassword = await bcrypt.hash('client123', 10)
  
  const customers = [
    {
      name: 'Juan Pérez García',
      email: 'juan.perez@email.com',
      phone: '55 9876 5432',
      company: 'Pérez y Asociados',
      taxId: 'PEGJ850101ABC',
      status: 'ACTIVE',
      portalPassword,
      portalActive: true,
    },
    {
      name: 'María López Hernández',
      email: 'maria.lopez@email.com',
      phone: '55 8765 4321',
      company: 'López Consultores',
      taxId: 'LOHM900215DEF',
      status: 'ACTIVE',
    },
    {
      name: 'Carlos Ramírez Sánchez',
      email: 'carlos.ramirez@email.com',
      phone: '55 7654 3210',
      company: 'Ramírez Corp',
      taxId: 'RASC920330GHI',
      status: 'ACTIVE',
    },
  ]

  for (const customer of customers) {
    const existing = await prisma.customer.findFirst({
      where: { email: customer.email },
    })
    
    if (!existing) {
      await prisma.customer.create({
        data: customer as any,
      })
    }
  }

  console.log('✅ Clientes de ejemplo creados')

  // Create sample products
  const products = [
    {
      name: 'Consultoría Empresarial',
      description: 'Servicios de consultoría empresarial por hora',
      type: 'SERVICE',
      price: 1500,
      taxable: true,
      taxRate: 16,
      category: 'Servicios Profesionales',
      status: 'ACTIVE',
    },
    {
      name: 'Desarrollo de Software',
      description: 'Desarrollo de aplicaciones web personalizadas',
      type: 'SERVICE',
      price: 25000,
      taxable: true,
      taxRate: 16,
      category: 'Tecnología',
      status: 'ACTIVE',
    },
    {
      name: 'Soporte Técnico Mensual',
      description: 'Plan de soporte técnico mensual',
      type: 'SERVICE',
      price: 5000,
      taxable: true,
      taxRate: 16,
      category: 'Servicios Técnicos',
      status: 'ACTIVE',
    },
    {
      name: 'Laptop HP ProBook',
      description: 'Laptop HP ProBook 450 G8',
      type: 'PRODUCT',
      sku: 'HP-PB-450',
      price: 18000,
      cost: 14000,
      taxable: true,
      taxRate: 16,
      category: 'Hardware',
      status: 'ACTIVE',
    },
  ]

  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { sku: product.sku },
    })
    
    if (!existing) {
      await prisma.product.create({
        data: product as any,
      })
    }
  }

  console.log('✅ Productos de ejemplo creados')

  // ==================== PLAN DE CUENTAS ====================
  const chartOfAccounts = [
    // ACTIVOS
    { code: '1000', name: 'ACTIVOS', type: 'ASSET', category: null, level: 1 },
    { code: '1100', name: 'Activo Circulante', type: 'ASSET', category: 'CURRENT_ASSET', level: 2, parentCode: '1000' },
    { code: '1110', name: 'Efectivo y Equivalentes', type: 'ASSET', category: 'CURRENT_ASSET', level: 3, parentCode: '1100' },
    { code: '1120', name: 'Bancos', type: 'ASSET', category: 'CURRENT_ASSET', level: 3, parentCode: '1100' },
    { code: '1130', name: 'Cuentas por Cobrar', type: 'ASSET', category: 'CURRENT_ASSET', level: 3, parentCode: '1100' },
    { code: '1140', name: 'Inventarios', type: 'ASSET', category: 'CURRENT_ASSET', level: 3, parentCode: '1100' },
    { code: '1200', name: 'Activo Fijo', type: 'ASSET', category: 'FIXED_ASSET', level: 2, parentCode: '1000' },
    { code: '1210', name: 'Terrenos', type: 'ASSET', category: 'FIXED_ASSET', level: 3, parentCode: '1200' },
    { code: '1220', name: 'Edificios', type: 'ASSET', category: 'FIXED_ASSET', level: 3, parentCode: '1200' },
    { code: '1230', name: 'Maquinaria y Equipo', type: 'ASSET', category: 'FIXED_ASSET', level: 3, parentCode: '1200' },
    { code: '1240', name: 'Equipo de Cómputo', type: 'ASSET', category: 'FIXED_ASSET', level: 3, parentCode: '1200' },
    { code: '1250', name: 'Depreciación Acumulada', type: 'ASSET', category: 'FIXED_ASSET', level: 3, parentCode: '1200' },
    
    // PASIVOS
    { code: '2000', name: 'PASIVOS', type: 'LIABILITY', category: null, level: 1 },
    { code: '2100', name: 'Pasivo Circulante', type: 'LIABILITY', category: 'CURRENT_LIABILITY', level: 2, parentCode: '2000' },
    { code: '2110', name: 'Cuentas por Pagar', type: 'LIABILITY', category: 'CURRENT_LIABILITY', level: 3, parentCode: '2100' },
    { code: '2120', name: 'IVA por Pagar', type: 'LIABILITY', category: 'CURRENT_LIABILITY', level: 3, parentCode: '2100' },
    { code: '2130', name: 'ISR por Pagar', type: 'LIABILITY', category: 'CURRENT_LIABILITY', level: 3, parentCode: '2100' },
    { code: '2200', name: 'Pasivo a Largo Plazo', type: 'LIABILITY', category: 'LONG_TERM_LIABILITY', level: 2, parentCode: '2000' },
    { code: '2210', name: 'Préstamos Bancarios LP', type: 'LIABILITY', category: 'LONG_TERM_LIABILITY', level: 3, parentCode: '2200' },
    
    // CAPITAL
    { code: '3000', name: 'CAPITAL', type: 'EQUITY', category: 'EQUITY', level: 1 },
    { code: '3100', name: 'Capital Social', type: 'EQUITY', category: 'EQUITY', level: 2, parentCode: '3000' },
    { code: '3200', name: 'Utilidades Retenidas', type: 'EQUITY', category: 'EQUITY', level: 2, parentCode: '3000' },
    { code: '3300', name: 'Utilidad del Ejercicio', type: 'EQUITY', category: 'EQUITY', level: 2, parentCode: '3000' },
    
    // INGRESOS
    { code: '4000', name: 'INGRESOS', type: 'REVENUE', category: null, level: 1 },
    { code: '4100', name: 'Ingresos por Ventas', type: 'REVENUE', category: 'OPERATING_REVENUE', level: 2, parentCode: '4000' },
    { code: '4110', name: 'Ventas de Productos', type: 'REVENUE', category: 'OPERATING_REVENUE', level: 3, parentCode: '4100' },
    { code: '4120', name: 'Ventas de Servicios', type: 'REVENUE', category: 'OPERATING_REVENUE', level: 3, parentCode: '4100' },
    { code: '4200', name: 'Otros Ingresos', type: 'REVENUE', category: 'NON_OPERATING_REVENUE', level: 2, parentCode: '4000' },
    
    // GASTOS
    { code: '5000', name: 'COSTOS Y GASTOS', type: 'EXPENSE', category: null, level: 1 },
    { code: '5100', name: 'Costo de Ventas', type: 'EXPENSE', category: 'COST_OF_GOODS_SOLD', level: 2, parentCode: '5000' },
    { code: '5200', name: 'Gastos de Operación', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 2, parentCode: '5000' },
    { code: '5210', name: 'Sueldos y Salarios', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3, parentCode: '5200' },
    { code: '5220', name: 'Renta', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3, parentCode: '5200' },
    { code: '5230', name: 'Servicios Públicos', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3, parentCode: '5200' },
    { code: '5240', name: 'Publicidad', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3, parentCode: '5200' },
    { code: '5250', name: 'Depreciación', type: 'EXPENSE', category: 'OPERATING_EXPENSE', level: 3, parentCode: '5200' },
  ]

  const accountMap = new Map()

  for (const account of chartOfAccounts) {
    const { parentCode, ...accountData } = account
    let parentId = null
    
    if (parentCode) {
      parentId = accountMap.get(parentCode)
    }

    const existingAccount = await prisma.chartOfAccounts.findUnique({
      where: { code: account.code },
    })

    if (!existingAccount) {
      const created = await prisma.chartOfAccounts.create({
        data: {
          ...accountData,
          parentId,
        } as any,
      })
      accountMap.set(account.code, created.id)
    } else {
      accountMap.set(account.code, existingAccount.id)
    }
  }

  console.log('✅ Plan de cuentas creado')

  // ==================== MONEDAS ====================
  const currencies = [
    { code: 'MXN', name: 'Peso Mexicano', symbol: '$', exchangeRate: 1, isBaseCurrency: true },
    { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', exchangeRate: 17.5, isBaseCurrency: false },
    { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 19.2, isBaseCurrency: false },
  ]

  for (const currency of currencies) {
    const existing = await prisma.currency.findUnique({
      where: { code: currency.code },
    })

    if (!existing) {
      await prisma.currency.create({
        data: {
          ...currency,
          exchangeRates: {
            create: {
              date: new Date(),
              rate: currency.exchangeRate,
              source: 'Manual',
            },
          },
        },
      })
    }
  }

  console.log('✅ Monedas creadas')

  // ==================== CENTROS DE COSTO ====================
  const costCenters = [
    { code: 'ADM', name: 'Administración', description: 'Gastos administrativos generales' },
    { code: 'VEN', name: 'Ventas', description: 'Departamento de ventas' },
    { code: 'PRO', name: 'Producción', description: 'Área de producción' },
    { code: 'MKT', name: 'Marketing', description: 'Marketing y publicidad' },
    { code: 'TI', name: 'Tecnología', description: 'Infraestructura y desarrollo TI' },
  ]

  for (const center of costCenters) {
    const existing = await prisma.costCenter.findUnique({
      where: { code: center.code },
    })

    if (!existing) {
      await prisma.costCenter.create({
        data: center,
      })
    }
  }

  console.log('✅ Centros de costo creados')

  // ==================== ACTIVOS FIJOS ====================
  const assets = [
    {
      assetNumber: 'ASSET-1',
      name: 'Computadora Dell XPS 15',
      description: 'Laptop para desarrollo',
      category: 'COMPUTER',
      purchaseDate: new Date('2024-01-15'),
      purchasePrice: 35000,
      salvageValue: 5000,
      usefulLife: 4,
      depreciationMethod: 'STRAIGHT_LINE',
      bookValue: 35000,
    },
    {
      assetNumber: 'ASSET-2',
      name: 'Escritorio Ejecutivo',
      description: 'Mobiliario de oficina',
      category: 'FURNITURE',
      purchaseDate: new Date('2024-02-01'),
      purchasePrice: 8000,
      salvageValue: 1000,
      usefulLife: 10,
      depreciationMethod: 'STRAIGHT_LINE',
      bookValue: 8000,
    },
  ]

  for (const asset of assets) {
    const existing = await prisma.asset.findUnique({
      where: { assetNumber: asset.assetNumber },
    })

    if (!existing) {
      await prisma.asset.create({
        data: asset as any,
      })
    }
  }

  console.log('✅ Activos fijos creados')

  // ==================== PRESUPUESTO ====================
  const bankAccountId = accountMap.get('5210') // Sueldos y Salarios

  if (bankAccountId) {
    const existingBudget = await prisma.budget.findFirst({
      where: {
        name: 'Presupuesto de Nómina 2025',
      },
    })

    if (!existingBudget) {
      await prisma.budget.create({
        data: {
          name: 'Presupuesto de Nómina 2025',
          fiscalYear: 2025,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          accountId: bankAccountId,
          amount: 600000,
          remaining: 600000,
          periods: {
            create: Array.from({ length: 12 }, (_, i) => ({
              period: `2025-${String(i + 1).padStart(2, '0')}`,
              startDate: new Date(2025, i, 1),
              endDate: new Date(2025, i + 1, 0),
              budgetAmount: 50000,
            })),
          },
        },
      })
    }
  }

  console.log('✅ Presupuestos creados')

  // Create sample employees
  const employees = [
    {
      userId: adminUser.id,
      employeeNumber: 'EMP-001',
      firstName: 'Ana',
      lastName: 'García López',
      email: 'ana.garcia@empresa.com',
      phone: '55 1111 2222',
      position: 'Gerente de Ventas',
      department: 'Ventas',
      hireDate: new Date('2024-01-15'),
      salary: 65000,
      salaryType: 'YEARLY',
      status: 'ACTIVE',
      taxId: '123-45-6789',
      address: 'Av. Reforma 123, CDMX',
      employeeType: 'EMPLOYEE',
    },
    {
      userId: adminUser.id,
      employeeNumber: 'EMP-002',
      firstName: 'Roberto',
      lastName: 'Martínez Cruz',
      email: 'roberto.martinez@empresa.com',
      phone: '55 2222 3333',
      position: 'Desarrollador Senior',
      department: 'Tecnología',
      hireDate: new Date('2023-06-01'),
      salary: 75000,
      salaryType: 'YEARLY',
      status: 'ACTIVE',
      taxId: '987-65-4321',
      address: 'Calle Insurgentes 456, CDMX',
      employeeType: 'EMPLOYEE',
    },
    {
      userId: adminUser.id,
      employeeNumber: 'EMP-003',
      firstName: 'Laura',
      lastName: 'Sánchez Díaz',
      email: 'laura.sanchez@empresa.com',
      phone: '55 3333 4444',
      position: 'Contadora',
      department: 'Finanzas',
      hireDate: new Date('2024-03-10'),
      salary: 55000,
      salaryType: 'YEARLY',
      status: 'ACTIVE',
      taxId: '456-78-9012',
      address: 'Col. Roma Norte, CDMX',
      employeeType: 'EMPLOYEE',
    },
  ]

  const createdEmployees = []
  for (const employeeData of employees) {
    const existing = await prisma.employee.findFirst({
      where: { email: employeeData.email },
    })
    
    if (!existing) {
      const employee = await prisma.employee.create({
        data: employeeData as any,
      })
      createdEmployees.push(employee)
    } else {
      createdEmployees.push(existing)
    }
  }

  console.log('✅ Empleados creados:', createdEmployees.length)

  // Create payroll records for 2025 (Q1-Q3)
  for (const employee of createdEmployees) {
    const monthlySalary = employee.salary / 12
    const months = [
      // Q1 2025
      { start: new Date('2025-01-01'), end: new Date('2025-01-31') },
      { start: new Date('2025-02-01'), end: new Date('2025-02-28') },
      { start: new Date('2025-03-01'), end: new Date('2025-03-31') },
      // Q2 2025
      { start: new Date('2025-04-01'), end: new Date('2025-04-30') },
      { start: new Date('2025-05-01'), end: new Date('2025-05-31') },
      { start: new Date('2025-06-01'), end: new Date('2025-06-30') },
      // Q3 2025
      { start: new Date('2025-07-01'), end: new Date('2025-07-31') },
      { start: new Date('2025-08-01'), end: new Date('2025-08-31') },
      { start: new Date('2025-09-01'), end: new Date('2025-09-30') },
    ]

    for (const month of months) {
      // Federal taxes: ~20% withholding
      const federalTax = monthlySalary * 0.20
      // Social Security: 6.2%
      const socialSecurityTax = monthlySalary * 0.062
      // Medicare: 1.45%
      const medicareTax = monthlySalary * 0.0145
      // State taxes (if applicable): ~3%
      const stateTax = monthlySalary * 0.03
      
      const totalDeductions = federalTax + socialSecurityTax + medicareTax + stateTax
      const netSalary = monthlySalary - totalDeductions

      const existing = await prisma.payroll.findFirst({
        where: {
          employeeId: employee.id,
          periodStart: month.start,
        },
      })

      if (!existing) {
        await prisma.payroll.create({
          data: {
            employeeId: employee.id,
            periodStart: month.start,
            periodEnd: month.end,
            grossSalary: monthlySalary,
            deductions: totalDeductions,
            bonuses: 0,
            netSalary: netSalary,
            paymentDate: new Date(month.end.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days after period end
            status: 'PAID',
            notes: `Nómina mensual - ${month.start.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`,
          },
        })
      }
    }
  }

  console.log('✅ Registros de nómina 2025 creados')

  console.log('🎉 Seed completado exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
