import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener información fiscal completa
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const type = searchParams.get('type') // info, deductions, estimates, export
    const year = searchParams.get('year') || new Date().getFullYear().toString()
    
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    const startDate = new Date(`${year}-01-01`)
    const endDate = new Date(`${year}-12-31`)

    // Obtener datos de la compañía
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Consultas separadas para cada tipo de dato (sin relaciones directas)
    const [invoices, expenses, employees, customers, vendors, payrolls] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          companyId,
          issueDate: { gte: startDate, lte: endDate }
        }
      }),
      prisma.expense.findMany({
        where: {
          companyId,
          date: { gte: startDate, lte: endDate }
        },
        include: {
          category: true
        }
      }),
      prisma.employee.findMany({
        where: { companyId }
      }),
      prisma.customer.findMany({
        where: { companyId }
      }),
      prisma.vendor.findMany({
        where: { companyId }
      }),
      prisma.payroll.findMany({
        where: {
          companyId,
          periodEnd: { gte: startDate, lte: endDate }
        }
      })
    ])

    // Calcular ingresos totales
    const totalRevenue = invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + Number(inv.total), 0)

    // Calcular gastos totales por categoría
    const expensesByCategory = expenses.reduce((acc, exp) => {
      const categoryName = exp.category?.name || 'Sin categoría'
      if (!acc[categoryName]) {
        acc[categoryName] = { amount: 0, count: 0, items: [] as typeof expenses }
      }
      acc[categoryName].amount += Number(exp.amount)
      acc[categoryName].count += 1
      acc[categoryName].items.push(exp)
      return acc
    }, {} as Record<string, { amount: number; count: number; items: typeof expenses }>)

    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)

    // Calcular nómina total usando Payroll model
    const totalPayroll = payrolls.reduce((sum, p) => sum + Number(p.grossSalary), 0)

    // Calcular impuestos de nómina (deductions incluyen impuestos)
    const payrollTaxes = payrolls.reduce((sum, p) => sum + Number(p.deductions), 0)

    // Calcular utilidad neta
    const netIncome = totalRevenue - totalExpenses - totalPayroll

    // Tax rates
    const federalTaxRate = 0.21 // 21% federal corporate
    const stateTaxRate = 0.055 // 5.5% Florida state tax

    const estimatedFederalTax = Math.max(0, netIncome * federalTaxRate)
    const estimatedStateTax = Math.max(0, netIncome * stateTaxRate)
    const totalEstimatedTax = estimatedFederalTax + estimatedStateTax

    // Generar deducciones
    const deductions = Object.entries(expensesByCategory).map(([category, data], index) => ({
      id: `DED-${String(index + 1).padStart(3, '0')}`,
      category: getCategoryGroup(category),
      subcategory: category,
      description: `${data.count} transacciones en ${category}`,
      amount: data.amount,
      date: year + '-12-31',
      status: data.count >= 3 ? 'documented' : 'needs-documentation',
      documentCount: data.count,
      taxDeductible: isDeductible(category),
      deductibleAmount: isDeductible(category) ? data.amount : 0
    }))

    // Añadir nómina como deducción
    if (totalPayroll > 0) {
      deductions.unshift({
        id: 'DED-PAYROLL',
        category: 'Operating Expenses',
        subcategory: 'Salaries & Wages',
        description: `Nómina de ${employees.length} empleados`,
        amount: totalPayroll,
        date: year + '-12-31',
        status: 'documented',
        documentCount: employees.length * 12,
        taxDeductible: true,
        deductibleAmount: totalPayroll
      })
    }

    // Calcular total de deducciones
    const totalDeductions = deductions
      .filter(d => d.taxDeductible)
      .reduce((sum, d) => sum + d.deductibleAmount, 0)

    // Generar estimaciones trimestrales
    const quarterlyEstimates = [
      {
        quarter: 'Q1 ' + year,
        dueDate: `${year}-04-15`,
        estimatedIncome: totalRevenue / 4,
        estimatedTax: totalEstimatedTax / 4,
        previousPayments: 0,
        amountDue: totalEstimatedTax / 4,
        status: getQuarterStatus(1, parseInt(year)),
        paidAmount: getQuarterStatus(1, parseInt(year)) === 'paid' ? totalEstimatedTax / 4 : undefined
      },
      {
        quarter: 'Q2 ' + year,
        dueDate: `${year}-06-15`,
        estimatedIncome: totalRevenue / 4,
        estimatedTax: totalEstimatedTax / 4,
        previousPayments: totalEstimatedTax / 4,
        amountDue: totalEstimatedTax / 4,
        status: getQuarterStatus(2, parseInt(year)),
        paidAmount: getQuarterStatus(2, parseInt(year)) === 'paid' ? totalEstimatedTax / 4 : undefined
      },
      {
        quarter: 'Q3 ' + year,
        dueDate: `${year}-09-15`,
        estimatedIncome: totalRevenue / 4,
        estimatedTax: totalEstimatedTax / 4,
        previousPayments: (totalEstimatedTax / 4) * 2,
        amountDue: totalEstimatedTax / 4,
        status: getQuarterStatus(3, parseInt(year)),
        paidAmount: getQuarterStatus(3, parseInt(year)) === 'paid' ? totalEstimatedTax / 4 : undefined
      },
      {
        quarter: 'Q4 ' + year,
        dueDate: `${parseInt(year) + 1}-01-15`,
        estimatedIncome: totalRevenue / 4,
        estimatedTax: totalEstimatedTax / 4,
        previousPayments: (totalEstimatedTax / 4) * 3,
        amountDue: totalEstimatedTax / 4,
        status: getQuarterStatus(4, parseInt(year)),
        paidAmount: getQuarterStatus(4, parseInt(year)) === 'paid' ? totalEstimatedTax / 4 : undefined
      }
    ]

    // Obligaciones fiscales
    const taxObligations = [
      {
        id: 'OBL-001',
        type: 'Federal Income Tax',
        description: 'Corporate tax return (Form 1120)',
        frequency: 'Annual',
        nextDueDate: `${parseInt(year) + 1}-03-15`,
        status: 'upcoming',
        amount: estimatedFederalTax,
        filingMethod: 'Electronic (IRS e-file)'
      },
      {
        id: 'OBL-002',
        type: 'Quarterly Estimated Tax',
        description: `Q4 ${year} estimated tax payment`,
        frequency: 'Quarterly',
        nextDueDate: `${parseInt(year) + 1}-01-15`,
        status: 'upcoming',
        amount: totalEstimatedTax / 4,
        filingMethod: 'EFTPS'
      },
      {
        id: 'OBL-003',
        type: 'State Corporate Income Tax',
        description: 'State corporate income tax return',
        frequency: 'Annual',
        nextDueDate: `${parseInt(year) + 1}-05-01`,
        status: 'upcoming',
        amount: estimatedStateTax,
        filingMethod: 'State Department of Revenue'
      },
      {
        id: 'OBL-004',
        type: 'Sales & Use Tax',
        description: 'Monthly sales tax return',
        frequency: 'Monthly',
        nextDueDate: getNextMonthEnd(),
        status: 'upcoming',
        amount: totalRevenue * 0.07,
        filingMethod: 'Electronic'
      },
      {
        id: 'OBL-005',
        type: 'Payroll Tax (Form 941)',
        description: 'Federal quarterly payroll tax',
        frequency: 'Quarterly',
        nextDueDate: getNextQuarterEnd(),
        status: 'upcoming',
        amount: payrollTaxes,
        filingMethod: 'IRS e-file'
      },
      {
        id: 'OBL-006',
        type: 'Form W-2',
        description: 'Employee wage statements',
        frequency: 'Annual',
        nextDueDate: `${parseInt(year) + 1}-01-31`,
        status: 'upcoming',
        employeeCount: employees.length,
        filingMethod: 'SSA Business Services Online'
      },
      {
        id: 'OBL-007',
        type: 'Form 1099-NEC',
        description: 'Nonemployee compensation reporting',
        frequency: 'Annual',
        nextDueDate: `${parseInt(year) + 1}-01-31`,
        status: 'upcoming',
        vendorCount: vendors.length,
        filingMethod: 'IRS FIRE System'
      }
    ]

    // Configuración fiscal
    const taxSettings = {
      ein: company.taxId || 'XX-XXXXXXX',
      taxYear: year,
      filingStatus: 'Corporation (C-Corp)',
      accountingMethod: 'Accrual',
      fiscalYearEnd: 'December 31',
      state: 'Florida',
      stateId: company.taxId ? company.taxId.replace('-', '') : null,
      industry: 'Professional Services',
      naicsCode: '541000',
      federalTaxRate: federalTaxRate * 100,
      stateTaxRate: stateTaxRate * 100
    }

    // Estadísticas para exportación
    const exportStats = {
      invoiceCount: invoices.length,
      expenseCount: expenses.length,
      employeeCount: employees.length,
      vendorCount: vendors.length,
      customerCount: customers.length,
      transactionCount: invoices.length + expenses.length,
      dataReady: true
    }

    // TurboTax mapping
    const turboTaxMapping = [
      {
        category: 'Income',
        quickbooksAccount: 'Sales Revenue',
        turboTaxForm: 'Form 1120',
        turboTaxLine: 'Line 1a - Gross receipts',
        amount: totalRevenue,
        status: 'mapped'
      },
      {
        category: 'Cost of Goods Sold',
        quickbooksAccount: 'Cost of Sales',
        turboTaxForm: 'Form 1120',
        turboTaxLine: 'Line 2 - Cost of goods sold',
        amount: expensesByCategory['Costo de Ventas']?.amount || 0,
        status: 'mapped'
      },
      {
        category: 'Expenses',
        quickbooksAccount: 'Operating Expenses',
        turboTaxForm: 'Form 1120',
        turboTaxLine: 'Lines 12-26 - Deductions',
        amount: totalExpenses,
        status: 'mapped'
      },
      {
        category: 'Payroll',
        quickbooksAccount: 'Salaries & Wages',
        turboTaxForm: 'Form 1120',
        turboTaxLine: 'Line 13 - Salaries and wages',
        amount: totalPayroll,
        status: 'mapped'
      },
      {
        category: 'Net Income',
        quickbooksAccount: 'Net Profit/Loss',
        turboTaxForm: 'Form 1120',
        turboTaxLine: 'Line 30 - Taxable income',
        amount: netIncome,
        status: 'mapped'
      }
    ]

    return NextResponse.json({
      success: true,
      year,
      company: {
        id: company.id,
        name: company.name,
        taxId: company.taxId
      },
      summary: {
        totalRevenue,
        totalExpenses,
        totalPayroll,
        payrollTaxes,
        netIncome,
        totalDeductions,
        estimatedFederalTax,
        estimatedStateTax,
        totalEstimatedTax
      },
      taxSettings,
      taxObligations,
      deductions,
      quarterlyEstimates,
      exportStats,
      turboTaxMapping,
      expensesByCategory: Object.entries(expensesByCategory).map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        deductible: isDeductible(name)
      }))
    })

  } catch (error) {
    console.error('Error fetching tax data:', error)
    return NextResponse.json({ 
      error: 'Error fetching tax data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Generar exportación o realizar cálculos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, companyId, year, format, dateRange } = body

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    switch (action) {
      case 'calculate-estimate':
        return await calculateTaxEstimate(companyId, year || new Date().getFullYear().toString())
      
      case 'export':
        return await generateExport(companyId, year, format, dateRange)
      
      case 'sync-turbotax':
        return await syncTurboTax(companyId, year)
      
      case 'save-settings':
        return await saveTaxSettings(companyId, body.settings)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing tax request:', error)
    return NextResponse.json({ 
      error: 'Error processing request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Función para calcular estimación de impuestos
async function calculateTaxEstimate(companyId: string, year: string) {
  const startDate = new Date(`${year}-01-01`)
  const endDate = new Date(`${year}-12-31`)

  const [invoices, expenses, payrolls] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        issueDate: { gte: startDate, lte: endDate },
        status: 'PAID'
      }
    }),
    prisma.expense.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate }
      }
    }),
    prisma.payroll.findMany({
      where: {
        companyId,
        periodEnd: { gte: startDate, lte: endDate }
      }
    })
  ])

  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total), 0)
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
  const totalPayroll = payrolls.reduce((sum, p) => sum + Number(p.grossSalary), 0)
  
  const netIncome = totalRevenue - totalExpenses - totalPayroll
  
  const federalTax = Math.max(0, netIncome * 0.21)
  const stateTax = Math.max(0, netIncome * 0.055)
  const selfEmploymentTax = 0 // Solo para sole proprietors
  const totalTax = federalTax + stateTax

  return NextResponse.json({
    success: true,
    estimate: {
      year,
      totalRevenue,
      totalExpenses,
      totalPayroll,
      netIncome,
      federalTax,
      stateTax,
      selfEmploymentTax,
      totalTax,
      quarterlyPayment: totalTax / 4,
      effectiveRate: netIncome > 0 ? (totalTax / netIncome * 100).toFixed(2) : 0
    }
  })
}

// Función para generar exportación
async function generateExport(companyId: string, year: string, format: string, dateRange: { start?: string; end?: string }) {
  const startDate = new Date(dateRange?.start || `${year}-01-01`)
  const endDate = new Date(dateRange?.end || `${year}-12-31`)

  const [company, invoices, expenses, employees] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.invoice.findMany({
      where: { companyId, issueDate: { gte: startDate, lte: endDate } },
      include: { customer: true, items: true }
    }),
    prisma.expense.findMany({
      where: { companyId, date: { gte: startDate, lte: endDate } },
      include: { category: true }
    }),
    prisma.employee.findMany({
      where: { companyId },
      include: { payrolls: true }
    })
  ])

  const exportData = {
    company: {
      name: company?.name,
      taxId: company?.taxId,
      address: company?.address
    },
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    },
    summary: {
      totalIncome: invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
      totalExpenses: expenses.reduce((sum, exp) => sum + Number(exp.amount), 0),
      invoiceCount: invoices.length,
      expenseCount: expenses.length,
      employeeCount: employees.length
    },
    invoices: invoices.map(inv => ({
      number: inv.invoiceNumber,
      date: inv.issueDate,
      customer: inv.customer?.name,
      amount: Number(inv.total),
      tax: Number(inv.taxAmount)
    })),
    expenses: expenses.map(exp => ({
      date: exp.date,
      description: exp.description,
      category: exp.category?.name,
      amount: Number(exp.amount),
      deductible: true
    }))
  }

  // Simular generación de archivo
  const fileName = `tax_export_${year}_${format}.${format === 'excel' ? 'xlsx' : format}`
  const fileSize = JSON.stringify(exportData).length

  return NextResponse.json({
    success: true,
    export: {
      fileName,
      format,
      fileSize: `${(fileSize / 1024).toFixed(1)} KB`,
      recordCount: invoices.length + expenses.length,
      generatedAt: new Date().toISOString(),
      downloadUrl: `/api/taxes/download/${fileName}`
    },
    data: format === 'json' ? exportData : null
  })
}

// Función para sincronizar con TurboTax
async function syncTurboTax(companyId: string, year: string) {
  // Simular sincronización con TurboTax
  return NextResponse.json({
    success: true,
    sync: {
      status: 'completed',
      recordsSynced: 1250,
      formsUpdated: ['1120', '4562', 'Schedule K'],
      lastSync: new Date().toISOString(),
      nextStep: 'Review mapped data in TurboTax'
    }
  })
}

// Función para guardar configuración fiscal
async function saveTaxSettings(companyId: string, settings: { ein?: string }) {
  // Actualizar datos de la compañía
  await prisma.company.update({
    where: { id: companyId },
    data: {
      taxId: settings.ein,
      // Otros campos fiscales podrían guardarse en metadata
    }
  })

  return NextResponse.json({
    success: true,
    message: 'Tax settings saved successfully'
  })
}

// Helpers
function getCategoryGroup(category: string): string {
  const groups: Record<string, string> = {
    'Salaries': 'Operating Expenses',
    'Rent': 'Operating Expenses',
    'Utilities': 'Operating Expenses',
    'Office Supplies': 'Operating Expenses',
    'Insurance': 'Operating Expenses',
    'Legal': 'Professional Services',
    'Accounting': 'Professional Services',
    'Consulting': 'Professional Services',
    'Travel': 'Vehicle & Travel',
    'Vehicle': 'Vehicle & Travel',
    'Meals': 'Vehicle & Travel',
    'Marketing': 'Marketing & Advertising',
    'Advertising': 'Marketing & Advertising'
  }
  
  for (const [key, group] of Object.entries(groups)) {
    if (category.toLowerCase().includes(key.toLowerCase())) {
      return group
    }
  }
  return 'Other Expenses'
}

function isDeductible(category: string): boolean {
  const nonDeductible = ['personal', 'entertainment', 'gifts over $25', 'fines', 'penalties']
  return !nonDeductible.some(nd => category.toLowerCase().includes(nd))
}

function getQuarterStatus(quarter: number, year: number): 'paid' | 'pending' | 'overdue' {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  
  if (year < currentYear) return 'paid'
  if (year > currentYear) return 'pending'
  
  const quarterDueDates = [4, 6, 9, 1] // April, June, September, January (next year)
  const dueMonth = quarterDueDates[quarter - 1]
  
  if (quarter === 4) {
    return 'pending' // Q4 due in January next year
  }
  
  if (currentMonth > dueMonth + 1) return 'paid'
  if (currentMonth === dueMonth || currentMonth === dueMonth + 1) return 'pending'
  return 'pending'
}

function getNextMonthEnd(): string {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 20)
  return nextMonth.toISOString().split('T')[0]
}

function getNextQuarterEnd(): string {
  const now = new Date()
  const month = now.getMonth()
  const quarterEndMonths = [0, 3, 6, 9] // Jan, Apr, Jul, Oct
  const nextQuarterEnd = quarterEndMonths.find(m => m > month) || 12
  const yearVal = nextQuarterEnd === 12 ? now.getFullYear() + 1 : now.getFullYear()
  const endMonth = nextQuarterEnd === 12 ? 0 : nextQuarterEnd
  return new Date(yearVal, endMonth, 31).toISOString().split('T')[0]
}
