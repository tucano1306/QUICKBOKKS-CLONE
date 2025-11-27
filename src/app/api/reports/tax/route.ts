'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const year = searchParams.get('year') || new Date().getFullYear().toString()

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    const startDate = new Date(`${year}-01-01`)
    const endDate = new Date(`${year}-12-31`)

    // Get income from invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        status: 'PAID',
        issueDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        total: true,
        taxAmount: true,
        issueDate: true
      }
    })

    // Get expenses
    const expenses = await prisma.expense.findMany({
      where: {
        companyId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        amount: true,
        taxAmount: true,
        date: true
      }
    })

    // Calculate totals
    const totalIncome = invoices.reduce((s, i) => s + i.total, 0)
    const salesTax = invoices.reduce((s, i) => s + (i.taxAmount || 0), 0)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const inputTax = expenses.reduce((s, e) => s + (e.taxAmount || 0), 0)

    // Tax calculations (IVA 16% in Mexico)
    const ivaCollected = salesTax
    const ivaPaid = inputTax
    const ivaPayable = ivaCollected - ivaPaid

    // ISR estimate (corporate tax rate 30% on profit)
    const profit = totalIncome - totalExpenses
    const isrEstimate = profit > 0 ? profit * 0.30 : 0

    // Quarterly breakdown
    const quarters = [
      { name: 'Q1', start: new Date(`${year}-01-01`), end: new Date(`${year}-03-31`) },
      { name: 'Q2', start: new Date(`${year}-04-01`), end: new Date(`${year}-06-30`) },
      { name: 'Q3', start: new Date(`${year}-07-01`), end: new Date(`${year}-09-30`) },
      { name: 'Q4', start: new Date(`${year}-10-01`), end: new Date(`${year}-12-31`) }
    ]

    const quarterlyData = quarters.map(q => {
      const qInvoices = invoices.filter(i => {
        const d = new Date(i.issueDate)
        return d >= q.start && d <= q.end
      })
      const qExpenses = expenses.filter(e => {
        const d = new Date(e.date)
        return d >= q.start && d <= q.end
      })

      const qIncome = qInvoices.reduce((s, i) => s + i.total, 0)
      const qSalesTax = qInvoices.reduce((s, i) => s + (i.taxAmount || 0), 0)
      const qExpenseTotal = qExpenses.reduce((s, e) => s + e.amount, 0)
      const qInputTax = qExpenses.reduce((s, e) => s + (e.taxAmount || 0), 0)

      return {
        quarter: q.name,
        income: qIncome,
        expenses: qExpenseTotal,
        profit: qIncome - qExpenseTotal,
        ivaCollected: qSalesTax,
        ivaPaid: qInputTax,
        ivaPayable: qSalesTax - qInputTax
      }
    })

    // Tax obligations
    const obligations = [
      {
        id: 'IVA',
        name: 'IVA (Impuesto al Valor Agregado)',
        rate: '16%',
        base: totalIncome,
        collected: ivaCollected,
        paid: ivaPaid,
        payable: ivaPayable,
        dueDate: 'Día 17 del mes siguiente',
        status: ivaPayable > 0 ? 'pending' : 'paid'
      },
      {
        id: 'ISR',
        name: 'ISR (Impuesto Sobre la Renta)',
        rate: '30%',
        base: profit,
        estimate: isrEstimate,
        dueDate: 'Marzo del año siguiente',
        status: 'pending'
      }
    ]

    return NextResponse.json({ 
      summary: {
        year,
        totalIncome,
        totalExpenses,
        profit,
        ivaCollected,
        ivaPaid,
        ivaPayable,
        isrEstimate,
        totalTaxPayable: ivaPayable + isrEstimate
      },
      obligations,
      quarterlyData
    })

  } catch (error) {
    console.error('Error generating tax report:', error)
    return NextResponse.json({ error: 'Error generating report' }, { status: 500 })
  }
}
