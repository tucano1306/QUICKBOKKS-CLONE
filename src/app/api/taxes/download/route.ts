import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Descargar archivo de exportación
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const format = searchParams.get('format') || 'csv'
    const year = searchParams.get('year') || new Date().getFullYear().toString()
    const startDate = searchParams.get('startDate') || `${year}-01-01`
    const endDate = searchParams.get('endDate') || `${year}-12-31`

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Obtener datos
    const [company, invoices, expenses, employees, payrolls, vendors, customers] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.invoice.findMany({
        where: { 
          companyId, 
          issueDate: { gte: new Date(startDate), lte: new Date(endDate) } 
        },
        include: { customer: true, items: true }
      }),
      prisma.expense.findMany({
        where: { 
          companyId, 
          date: { gte: new Date(startDate), lte: new Date(endDate) } 
        },
        include: { category: true }
      }),
      prisma.employee.findMany({
        where: { companyId },
        include: { payrolls: { where: { periodEnd: { gte: new Date(startDate), lte: new Date(endDate) } } } }
      }),
      prisma.payroll.findMany({
        where: { 
          companyId, 
          periodEnd: { gte: new Date(startDate), lte: new Date(endDate) } 
        }
      }),
      prisma.vendor.findMany({ where: { companyId } }),
      prisma.customer.findMany({ where: { companyId } })
    ])

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Calcular totales
    const totalIncome = invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + Number(inv.total), 0)
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
    const totalPayroll = payrolls.reduce((sum, p) => sum + Number(p.grossSalary), 0)
    const netIncome = totalIncome - totalExpenses - totalPayroll

    // Generar contenido según formato
    let content: string
    let contentType: string
    let fileName: string

    switch (format.toLowerCase()) {
      case 'txf':
        content = generateTXF(company, invoices, expenses, employees, payrolls, year, totalIncome, totalExpenses, totalPayroll, netIncome)
        contentType = 'application/x-txf'
        fileName = `tax_export_${year}_txf.txf`
        break

      case 'iif':
        content = generateIIF(company, invoices, expenses, employees, payrolls, year, totalIncome, totalExpenses, totalPayroll)
        contentType = 'application/x-iif'
        fileName = `tax_export_${year}_iif.iif`
        break

      case 'csv':
        content = generateCSV(company, invoices, expenses, employees, payrolls, year)
        contentType = 'text/csv'
        fileName = `tax_export_${year}_data.csv`
        break

      case 'excel':
      case 'xlsx':
        // Para Excel generamos CSV con tabs (TSV) que Excel puede abrir directamente
        content = generateExcelTSV(company, invoices, expenses, employees, payrolls, year, totalIncome, totalExpenses, totalPayroll, netIncome)
        contentType = 'text/tab-separated-values'
        fileName = `tax_export_${year}_workbook.tsv`
        break

      case 'pdf':
        // Para PDF generamos HTML que se puede convertir/imprimir
        content = generatePDFReport(company, invoices, expenses, employees, payrolls, year, totalIncome, totalExpenses, totalPayroll, netIncome)
        contentType = 'text/html'
        fileName = `tax_report_${year}.html`
        break

      case 'json':
        content = generateJSON(company, invoices, expenses, employees, payrolls, vendors, customers, year, startDate, endDate, totalIncome, totalExpenses, totalPayroll, netIncome)
        contentType = 'application/json'
        fileName = `tax_export_${year}_data.json`
        break

      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

    // Devolver archivo para descarga
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(Buffer.byteLength(content, 'utf8'))
      }
    })

  } catch (error) {
    console.error('Error generating export:', error)
    return NextResponse.json({ 
      error: 'Error generating export',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Generar archivo TXF (Tax Exchange Format)
function generateTXF(
  company: { name: string; taxId: string | null },
  invoices: any[],
  expenses: any[],
  employees: any[],
  payrolls: any[],
  year: string,
  totalIncome: number,
  totalExpenses: number,
  totalPayroll: number,
  netIncome: number
) {
  const lines: string[] = []
  
  // Header TXF
  lines.push('V042') // TXF Version
  lines.push('AComputoPlus Tax Export') // Application name
  lines.push(`D${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`) // Date
  lines.push('^') // Separator
  
  // Company Info
  lines.push(`N${company.taxId || 'XX-XXXXXXX'}`) // EIN
  lines.push(`C1`) // Category: Business Income
  lines.push(`L1`) // Line number
  lines.push(`$${totalIncome.toFixed(2)}`) // Amount
  lines.push(`XGross Receipts - ${company.name}`) // Description
  lines.push('^')
  
  // Expenses by category (Form 1120 deductions)
  const expenseCategories = groupExpensesByCategory(expenses)
  
  // Cost of Goods Sold (Line 2)
  const cogsAmount = expenseCategories['Cost of Goods'] || expenseCategories['Costo de Ventas'] || 0
  if (cogsAmount > 0) {
    lines.push('N261') // TXF Code for COGS
    lines.push('C1')
    lines.push('L2')
    lines.push(`$${cogsAmount.toFixed(2)}`)
    lines.push('XCost of Goods Sold')
    lines.push('^')
  }

  // Salaries and Wages (Line 13)
  if (totalPayroll > 0) {
    lines.push('N507') // TXF Code for Wages
    lines.push('C1')
    lines.push('L13')
    lines.push(`$${totalPayroll.toFixed(2)}`)
    lines.push(`XSalaries and wages - ${employees.length} employees`)
    lines.push('^')
  }

  // Rent (Line 16)
  const rentAmount = expenseCategories['Rent'] || expenseCategories['Alquiler'] || 0
  if (rentAmount > 0) {
    lines.push('N327') // TXF Code for Rent
    lines.push('C1')
    lines.push('L16')
    lines.push(`$${rentAmount.toFixed(2)}`)
    lines.push('XRents')
    lines.push('^')
  }

  // Taxes and Licenses (Line 17)
  const taxesAmount = expenseCategories['Taxes'] || expenseCategories['Impuestos'] || 0
  if (taxesAmount > 0) {
    lines.push('N509') // TXF Code for Taxes
    lines.push('C1')
    lines.push('L17')
    lines.push(`$${taxesAmount.toFixed(2)}`)
    lines.push('XTaxes and licenses')
    lines.push('^')
  }

  // Other Deductions (Line 26)
  const otherExpenses = totalExpenses - cogsAmount - rentAmount - taxesAmount
  if (otherExpenses > 0) {
    lines.push('N264')
    lines.push('C1')
    lines.push('L26')
    lines.push(`$${otherExpenses.toFixed(2)}`)
    lines.push('XOther deductions')
    lines.push('^')
  }

  // Net Income (Line 30)
  lines.push('N465')
  lines.push('C1')
  lines.push('L30')
  lines.push(`$${netIncome.toFixed(2)}`)
  lines.push('XTaxable income before NOL deduction')
  lines.push('^')

  return lines.join('\r\n')
}

// Generar archivo IIF (Intuit Interchange Format)
function generateIIF(
  company: { name: string; taxId: string | null },
  invoices: any[],
  expenses: any[],
  employees: any[],
  payrolls: any[],
  year: string,
  totalIncome: number,
  totalExpenses: number,
  totalPayroll: number
) {
  const lines: string[] = []
  
  // Header IIF
  lines.push('!HDR\tPROD\tVER\tREL\tIIFVER\tDATE\tTIME\tACCNTNT\tACCNTNTSPLITTIME')
  lines.push(`HDR\tComputoPlus\t1.0\t1\t1\t${new Date().toLocaleDateString('en-US')}\t${new Date().toLocaleTimeString('en-US')}\tN\t0`)
  lines.push('')
  
  // Chart of Accounts
  lines.push('!ACCNT\tNAME\tACCNTTYPE\tDESC\tACCNUM\tEXTRA')
  lines.push('ACCNT\tIncome\tINC\tSales Revenue\t4000\t')
  lines.push('ACCNT\tCost of Goods Sold\tCOGS\tCost of Sales\t5000\t')
  lines.push('ACCNT\tOperating Expenses\tEXP\tGeneral Expenses\t6000\t')
  lines.push('ACCNT\tPayroll Expenses\tEXP\tSalaries and Wages\t6200\t')
  lines.push('ACCNT\tAccounts Receivable\tAR\tCustomer Receivables\t1100\t')
  lines.push('ACCNT\tAccounts Payable\tAP\tVendor Payables\t2000\t')
  lines.push('ACCNT\tCash\tBANK\tOperating Account\t1000\t')
  lines.push('')
  
  // Transactions - Invoices
  lines.push('!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\tCLEAR\tTOPRINT\tNAMEISTAXABLE')
  lines.push('!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\tCLEAR\tQNTY\tREIMBEXP')
  lines.push('!ENDTRNS')
  
  // Add invoices
  invoices.forEach(inv => {
    const date = new Date(inv.issueDate).toLocaleDateString('en-US')
    const amount = Number(inv.total)
    
    lines.push(`TRNS\tINVOICE\t${date}\tAccounts Receivable\t${inv.customer?.name || 'Customer'}\t${amount.toFixed(2)}\t${inv.invoiceNumber}\tInvoice ${inv.invoiceNumber}\tN\tN\tN`)
    lines.push(`SPL\tINVOICE\t${date}\tIncome\t${inv.customer?.name || 'Customer'}\t${(-amount).toFixed(2)}\t${inv.invoiceNumber}\tSales Revenue\tN\t\tNOTHING`)
    lines.push('ENDTRNS')
  })
  lines.push('')
  
  // Add expenses
  expenses.forEach(exp => {
    const date = new Date(exp.date).toLocaleDateString('en-US')
    const amount = Number(exp.amount)
    const category = exp.category?.name || 'Operating Expenses'
    
    lines.push(`TRNS\tCHECK\t${date}\tCash\t${exp.vendor || 'Vendor'}\t${(-amount).toFixed(2)}\t\t${exp.description}\tN\tN\tN`)
    lines.push(`SPL\tCHECK\t${date}\t${mapCategoryToAccount(category)}\t${exp.vendor || 'Vendor'}\t${amount.toFixed(2)}\t\t${exp.description}\tN\t\tNOTHING`)
    lines.push('ENDTRNS')
  })
  lines.push('')
  
  // Add payroll
  payrolls.forEach(pay => {
    const date = new Date(pay.payDate).toLocaleDateString('en-US')
    const gross = Number(pay.grossSalary)
    
    lines.push(`TRNS\tCHECK\t${date}\tCash\tPayroll\t${(-gross).toFixed(2)}\t\tPayroll ${pay.periodStart} - ${pay.periodEnd}\tN\tN\tN`)
    lines.push(`SPL\tCHECK\t${date}\tPayroll Expenses\tPayroll\t${gross.toFixed(2)}\t\tGross Wages\tN\t\tNOTHING`)
    lines.push('ENDTRNS')
  })

  return lines.join('\r\n')
}

// Generar CSV
function generateCSV(
  company: { name: string; taxId: string | null },
  invoices: any[],
  expenses: any[],
  employees: any[],
  payrolls: any[],
  year: string
) {
  const lines: string[] = []
  
  // Header
  lines.push(`"Company","${company.name}"`)
  lines.push(`"Tax ID","${company.taxId || 'N/A'}"`)
  lines.push(`"Tax Year","${year}"`)
  lines.push(`"Export Date","${new Date().toISOString()}"`)
  lines.push('')
  
  // Income Section
  lines.push('"=== INCOME ==="')
  lines.push('"Date","Invoice Number","Customer","Subtotal","Tax","Total","Status"')
  invoices.forEach(inv => {
    lines.push(`"${new Date(inv.issueDate).toLocaleDateString()}","${inv.invoiceNumber}","${inv.customer?.name || ''}","${Number(inv.subtotal).toFixed(2)}","${Number(inv.taxAmount).toFixed(2)}","${Number(inv.total).toFixed(2)}","${inv.status}"`)
  })
  lines.push('')
  
  // Expenses Section
  lines.push('"=== EXPENSES ==="')
  lines.push('"Date","Description","Category","Amount","Vendor","Tax Deductible"')
  expenses.forEach(exp => {
    lines.push(`"${new Date(exp.date).toLocaleDateString()}","${exp.description}","${exp.category?.name || 'Uncategorized'}","${Number(exp.amount).toFixed(2)}","${exp.vendor || ''}","Yes"`)
  })
  lines.push('')
  
  // Payroll Section
  lines.push('"=== PAYROLL ==="')
  lines.push('"Pay Date","Period Start","Period End","Gross Salary","Deductions","Net Pay"')
  payrolls.forEach(pay => {
    lines.push(`"${new Date(pay.payDate).toLocaleDateString()}","${new Date(pay.periodStart).toLocaleDateString()}","${new Date(pay.periodEnd).toLocaleDateString()}","${Number(pay.grossSalary).toFixed(2)}","${Number(pay.deductions).toFixed(2)}","${Number(pay.netSalary).toFixed(2)}"`)
  })
  lines.push('')
  
  // Employees Section
  lines.push('"=== EMPLOYEES (W-2) ==="')
  lines.push('"Name","Position","Email","Hire Date","Salary"')
  employees.forEach(emp => {
    lines.push(`"${emp.name}","${emp.position || ''}","${emp.email || ''}","${emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : ''}","${Number(emp.salary).toFixed(2)}"`)
  })
  
  // Summary
  const totalIncome = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.total), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalPayroll = payrolls.reduce((s, p) => s + Number(p.grossSalary), 0)
  
  lines.push('')
  lines.push('"=== SUMMARY ==="')
  lines.push(`"Total Income","${totalIncome.toFixed(2)}"`)
  lines.push(`"Total Expenses","${totalExpenses.toFixed(2)}"`)
  lines.push(`"Total Payroll","${totalPayroll.toFixed(2)}"`)
  lines.push(`"Net Income","${(totalIncome - totalExpenses - totalPayroll).toFixed(2)}"`)

  return lines.join('\r\n')
}

// Generar Excel TSV (Tab-separated for Excel)
function generateExcelTSV(
  company: { name: string; taxId: string | null },
  invoices: any[],
  expenses: any[],
  employees: any[],
  payrolls: any[],
  year: string,
  totalIncome: number,
  totalExpenses: number,
  totalPayroll: number,
  netIncome: number
) {
  const lines: string[] = []
  
  // Summary Sheet Header
  lines.push(`${company.name} - Tax Year ${year}`)
  lines.push(`Tax ID: ${company.taxId || 'N/A'}`)
  lines.push(`Export Date: ${new Date().toLocaleDateString()}`)
  lines.push('')
  
  // Financial Summary
  lines.push('FINANCIAL SUMMARY')
  lines.push('Category\tAmount')
  lines.push(`Total Income\t${totalIncome.toFixed(2)}`)
  lines.push(`Total Expenses\t${totalExpenses.toFixed(2)}`)
  lines.push(`Total Payroll\t${totalPayroll.toFixed(2)}`)
  lines.push(`Net Income\t${netIncome.toFixed(2)}`)
  lines.push('')
  
  // Income Details
  lines.push('INCOME DETAILS')
  lines.push('Date\tInvoice #\tCustomer\tSubtotal\tTax\tTotal\tStatus')
  invoices.forEach(inv => {
    lines.push(`${new Date(inv.issueDate).toLocaleDateString()}\t${inv.invoiceNumber}\t${inv.customer?.name || ''}\t${Number(inv.subtotal).toFixed(2)}\t${Number(inv.taxAmount).toFixed(2)}\t${Number(inv.total).toFixed(2)}\t${inv.status}`)
  })
  lines.push('')
  
  // Expense Details
  lines.push('EXPENSE DETAILS')
  lines.push('Date\tDescription\tCategory\tAmount\tVendor\tDeductible')
  expenses.forEach(exp => {
    lines.push(`${new Date(exp.date).toLocaleDateString()}\t${exp.description}\t${exp.category?.name || ''}\t${Number(exp.amount).toFixed(2)}\t${exp.vendor || ''}\tYes`)
  })
  lines.push('')
  
  // Payroll Details
  lines.push('PAYROLL DETAILS')
  lines.push('Pay Date\tEmployee\tGross\tDeductions\tNet\tFederal Tax\tState Tax\tSS\tMedicare')
  payrolls.forEach(pay => {
    lines.push(`${new Date(pay.payDate).toLocaleDateString()}\t${pay.employeeId}\t${Number(pay.grossSalary).toFixed(2)}\t${Number(pay.deductions).toFixed(2)}\t${Number(pay.netSalary).toFixed(2)}\t${Number(pay.federalTax || 0).toFixed(2)}\t${Number(pay.stateTax || 0).toFixed(2)}\t${Number(pay.socialSecurity || 0).toFixed(2)}\t${Number(pay.medicare || 0).toFixed(2)}`)
  })
  lines.push('')
  
  // Employee W-2 Info
  lines.push('EMPLOYEE W-2 INFORMATION')
  lines.push('Name\tPosition\tEmail\tHire Date\tAnnual Salary\tTotal Gross YTD')
  employees.forEach(emp => {
    const empPayrolls = payrolls.filter(p => p.employeeId === emp.id)
    const ytdGross = empPayrolls.reduce((s, p) => s + Number(p.grossSalary), 0)
    lines.push(`${emp.name}\t${emp.position || ''}\t${emp.email || ''}\t${emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : ''}\t${Number(emp.salary).toFixed(2)}\t${ytdGross.toFixed(2)}`)
  })

  return lines.join('\r\n')
}

// Generar reporte PDF (como HTML para imprimir)
function generatePDFReport(
  company: { name: string; taxId: string | null },
  invoices: any[],
  expenses: any[],
  employees: any[],
  payrolls: any[],
  year: string,
  totalIncome: number,
  totalExpenses: number,
  totalPayroll: number,
  netIncome: number
) {
  const federalTax = Math.max(0, netIncome * 0.21)
  const stateTax = Math.max(0, netIncome * 0.055)
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tax Report ${year} - ${company.name}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    .header { text-align: center; margin-bottom: 30px; }
    .company-info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
    th { background: #1e40af; color: white; }
    tr:nth-child(even) { background: #f9fafb; }
    .summary-box { background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .tax-box { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; }
    .amount { text-align: right; font-weight: bold; }
    .total { background: #dbeafe; font-weight: bold; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Tax Report ${year}</h1>
    <p style="color: #6b7280;">Generated by ComputoPlus on ${new Date().toLocaleDateString()}</p>
  </div>
  
  <div class="company-info">
    <h3 style="margin-top: 0;">Company Information</h3>
    <p><strong>Company Name:</strong> ${company.name}</p>
    <p><strong>Tax ID (EIN):</strong> ${company.taxId || 'Not provided'}</p>
    <p><strong>Tax Year:</strong> ${year}</p>
  </div>

  <h2>📈 Income Summary</h2>
  <div class="summary-box">
    <table>
      <tr><td>Total Gross Income</td><td class="amount">$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
      <tr><td>Total Expenses</td><td class="amount">($${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })})</td></tr>
      <tr><td>Total Payroll</td><td class="amount">($${totalPayroll.toLocaleString('en-US', { minimumFractionDigits: 2 })})</td></tr>
      <tr class="total"><td>Net Taxable Income</td><td class="amount">$${netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
    </table>
  </div>

  <h2>💰 Estimated Tax Liability</h2>
  <div class="tax-box">
    <table>
      <tr><td>Federal Corporate Tax (21%)</td><td class="amount">$${federalTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
      <tr><td>State Tax (5.5%)</td><td class="amount">$${stateTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
      <tr class="total"><td>Total Estimated Tax</td><td class="amount">$${(federalTax + stateTax).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
    </table>
  </div>

  <h2>📋 Invoice Summary (${invoices.length} invoices)</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Invoice #</th><th>Customer</th><th>Amount</th><th>Status</th></tr>
    </thead>
    <tbody>
      ${invoices.slice(0, 20).map(inv => `
        <tr>
          <td>${new Date(inv.issueDate).toLocaleDateString()}</td>
          <td>${inv.invoiceNumber}</td>
          <td>${inv.customer?.name || 'N/A'}</td>
          <td class="amount">$${Number(inv.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td>${inv.status}</td>
        </tr>
      `).join('')}
      ${invoices.length > 20 ? `<tr><td colspan="5" style="text-align: center; color: #6b7280;">... and ${invoices.length - 20} more invoices</td></tr>` : ''}
    </tbody>
  </table>

  <h2>📝 Expense Summary (${expenses.length} expenses)</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr>
    </thead>
    <tbody>
      ${expenses.slice(0, 20).map(exp => `
        <tr>
          <td>${new Date(exp.date).toLocaleDateString()}</td>
          <td>${exp.description}</td>
          <td>${exp.category?.name || 'Uncategorized'}</td>
          <td class="amount">$${Number(exp.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')}
      ${expenses.length > 20 ? `<tr><td colspan="4" style="text-align: center; color: #6b7280;">... and ${expenses.length - 20} more expenses</td></tr>` : ''}
    </tbody>
  </table>

  <h2>👥 Employee/Payroll Summary (${employees.length} employees)</h2>
  <table>
    <thead>
      <tr><th>Employee</th><th>Position</th><th>Annual Salary</th><th>YTD Gross</th></tr>
    </thead>
    <tbody>
      ${employees.map(emp => {
        const empPayrolls = payrolls.filter(p => p.employeeId === emp.id)
        const ytdGross = empPayrolls.reduce((s, p) => s + Number(p.grossSalary), 0)
        return `
          <tr>
            <td>${emp.name}</td>
            <td>${emp.position || 'N/A'}</td>
            <td class="amount">$${Number(emp.salary).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="amount">$${ytdGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
        `
      }).join('')}
    </tbody>
  </table>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #d1d5db; color: #6b7280; font-size: 12px;">
    <p><strong>Disclaimer:</strong> This report is for informational purposes only and should not be considered tax advice. Please consult with a qualified tax professional or CPA for official tax filing.</p>
    <p>Report generated by ComputoPlus © ${new Date().getFullYear()}</p>
  </div>
</body>
</html>`
}

// Generar JSON completo
function generateJSON(
  company: { name: string; taxId: string | null; id?: string; address?: string | null },
  invoices: any[],
  expenses: any[],
  employees: any[],
  payrolls: any[],
  vendors: any[],
  customers: any[],
  year: string,
  startDate: string,
  endDate: string,
  totalIncome: number,
  totalExpenses: number,
  totalPayroll: number,
  netIncome: number
) {
  const federalTax = Math.max(0, netIncome * 0.21)
  const stateTax = Math.max(0, netIncome * 0.055)

  const data = {
    meta: {
      version: '1.0',
      exportDate: new Date().toISOString(),
      application: 'ComputoPlus',
      taxYear: year,
      dateRange: { start: startDate, end: endDate }
    },
    company: {
      name: company.name,
      taxId: company.taxId,
      address: company.address
    },
    summary: {
      totalIncome,
      totalExpenses,
      totalPayroll,
      netIncome,
      estimatedTax: {
        federal: federalTax,
        state: stateTax,
        total: federalTax + stateTax
      },
      counts: {
        invoices: invoices.length,
        expenses: expenses.length,
        employees: employees.length,
        payrolls: payrolls.length,
        vendors: vendors.length,
        customers: customers.length
      }
    },
    income: {
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.issueDate,
        customer: inv.customer?.name,
        customerId: inv.customerId,
        subtotal: Number(inv.subtotal),
        taxAmount: Number(inv.taxAmount),
        total: Number(inv.total),
        status: inv.status,
        items: inv.items?.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          amount: Number(item.amount)
        }))
      }))
    },
    deductions: {
      expenses: expenses.map(exp => ({
        id: exp.id,
        date: exp.date,
        description: exp.description,
        category: exp.category?.name,
        amount: Number(exp.amount),
        vendor: exp.vendor,
        taxDeductible: true
      })),
      byCategory: groupExpensesByCategoryDetailed(expenses)
    },
    payroll: {
      summary: {
        totalGross: totalPayroll,
        totalDeductions: payrolls.reduce((s, p) => s + Number(p.deductions), 0),
        totalNet: payrolls.reduce((s, p) => s + Number(p.netSalary), 0),
        federalTaxWithheld: payrolls.reduce((s, p) => s + Number(p.federalTax || 0), 0),
        stateTaxWithheld: payrolls.reduce((s, p) => s + Number(p.stateTax || 0), 0),
        socialSecurity: payrolls.reduce((s, p) => s + Number(p.socialSecurity || 0), 0),
        medicare: payrolls.reduce((s, p) => s + Number(p.medicare || 0), 0)
      },
      employees: employees.map(emp => {
        const empPayrolls = payrolls.filter(p => p.employeeId === emp.id)
        return {
          id: emp.id,
          name: emp.name,
          position: emp.position,
          email: emp.email,
          hireDate: emp.hireDate,
          annualSalary: Number(emp.salary),
          ytdGross: empPayrolls.reduce((s, p) => s + Number(p.grossSalary), 0),
          ytdNet: empPayrolls.reduce((s, p) => s + Number(p.netSalary), 0),
          payrollRecords: empPayrolls.length
        }
      }),
      payrollRecords: payrolls.map(pay => ({
        id: pay.id,
        employeeId: pay.employeeId,
        periodStart: pay.periodStart,
        periodEnd: pay.periodEnd,
        payDate: pay.payDate,
        grossSalary: Number(pay.grossSalary),
        deductions: Number(pay.deductions),
        netSalary: Number(pay.netSalary),
        federalTax: Number(pay.federalTax || 0),
        stateTax: Number(pay.stateTax || 0),
        socialSecurity: Number(pay.socialSecurity || 0),
        medicare: Number(pay.medicare || 0)
      }))
    },
    vendors1099: vendors.map(v => ({
      id: v.id,
      name: v.name,
      email: v.email,
      taxId: v.taxId,
      totalPaid: expenses
        .filter(e => e.vendorId === v.id)
        .reduce((s, e) => s + Number(e.amount), 0)
    })).filter(v => v.totalPaid >= 600), // Only vendors paid >= $600
    customers: customers.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      totalRevenue: invoices
        .filter(i => i.customerId === c.id && i.status === 'PAID')
        .reduce((s, i) => s + Number(i.total), 0)
    }))
  }

  return JSON.stringify(data, null, 2)
}

// Helper functions
function groupExpensesByCategory(expenses: any[]): Record<string, number> {
  return expenses.reduce((acc, exp) => {
    const category = exp.category?.name || 'Uncategorized'
    acc[category] = (acc[category] || 0) + Number(exp.amount)
    return acc
  }, {} as Record<string, number>)
}

function groupExpensesByCategoryDetailed(expenses: any[]): any[] {
  const grouped = expenses.reduce((acc, exp) => {
    const category = exp.category?.name || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = { category, amount: 0, count: 0 }
    }
    acc[category].amount += Number(exp.amount)
    acc[category].count += 1
    return acc
  }, {} as Record<string, any>)
  
  return Object.values(grouped)
}

function mapCategoryToAccount(category: string): string {
  const mapping: Record<string, string> = {
    'Rent': 'Operating Expenses',
    'Alquiler': 'Operating Expenses',
    'Utilities': 'Operating Expenses',
    'Servicios': 'Operating Expenses',
    'Cost of Goods': 'Cost of Goods Sold',
    'Costo de Ventas': 'Cost of Goods Sold',
    'Payroll': 'Payroll Expenses',
    'Nómina': 'Payroll Expenses'
  }
  
  for (const [key, account] of Object.entries(mapping)) {
    if (category.toLowerCase().includes(key.toLowerCase())) {
      return account
    }
  }
  return 'Operating Expenses'
}
