import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Detecta si una categoría corresponde a salarios / nómina (para el escenario "sin chófer")
const isSalaryCategory = (name: string | null | undefined): boolean =>
  /salari|n[oó]mina|sueldo|payroll|ch[oó]fer|chofer/i.test(name ?? '')

interface YearAgg {
  income: number
  expenses: number
  salary: number
}

const emptyAgg = (): YearAgg => ({ income: 0, expenses: 0, salary: 0 })

// GET /api/profitability?companyId=...
// Devuelve, por año con datos, ingresos/gastos/salarios y ganancia con y sin salarios.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    if (!companyId) {
      return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    }

    const hasAccess = await prisma.companyUser.findFirst({
      where: { userId: session.user.id, companyId },
    })
    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }

    // Fuentes de datos:
    //  - Ingresos: transacciones tipo INCOME
    //  - Gastos: tabla de gastos (Expense) + transacciones tipo EXPENSE
    const [transactions, expenses] = await Promise.all([
      prisma.transaction.findMany({
        where: { companyId },
        select: { type: true, category: true, amount: true, date: true },
      }),
      prisma.expense.findMany({
        where: { companyId },
        select: { amount: true, date: true, category: { select: { name: true } } },
      }),
    ])

    const byYear = new Map<number, YearAgg>()
    const getYear = (d: Date) => new Date(d).getUTCFullYear()
    const bump = (year: number): YearAgg => {
      const cur = byYear.get(year) ?? emptyAgg()
      byYear.set(year, cur)
      return cur
    }

    for (const t of transactions) {
      const agg = bump(getYear(t.date))
      if (t.type === 'INCOME') {
        agg.income += t.amount
      } else if (t.type === 'EXPENSE') {
        agg.expenses += t.amount
        if (isSalaryCategory(t.category)) agg.salary += t.amount
      }
    }

    for (const e of expenses) {
      const agg = bump(getYear(e.date))
      agg.expenses += e.amount
      if (isSalaryCategory(e.category?.name)) agg.salary += e.amount
    }

    const now = new Date()
    const currentYear = now.getUTCFullYear()

    const round2 = (n: number) => Math.round(n * 100) / 100

    const years = [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, agg]) => {
        const income = round2(agg.income)
        const expenses = round2(agg.expenses)
        const salary = round2(agg.salary)
        const expensesExclSalary = round2(expenses - salary)
        return {
          year,
          income,
          expenses,
          salary,
          expensesExclSalary,
          netProfit: round2(income - expenses),
          profitExclSalary: round2(income - expensesExclSalary),
          isPartial: year === currentYear,
        }
      })

    // Proyección anual del año en curso (anualizar lo acumulado por días transcurridos)
    let projection: null | {
      year: number
      income: number
      expenses: number
      salary: number
      netProfit: number
      profitExclSalary: number
      factor: number
    } = null

    const currentAgg = byYear.get(currentYear)
    if (currentAgg) {
      const startOfYear = Date.UTC(currentYear, 0, 1)
      const startOfNextYear = Date.UTC(currentYear + 1, 0, 1)
      const msElapsed = now.getTime() - startOfYear
      const msTotal = startOfNextYear - startOfYear
      const fraction = Math.max(msElapsed / msTotal, 1 / 365)
      const factor = 1 / fraction

      const income = round2(currentAgg.income * factor)
      const expenses = round2(currentAgg.expenses * factor)
      const salary = round2(currentAgg.salary * factor)
      projection = {
        year: currentYear,
        income,
        expenses,
        salary,
        netProfit: round2(income - expenses),
        profitExclSalary: round2(income - (expenses - salary)),
        factor: round2(factor),
      }
    }

    return NextResponse.json({ companyId, currentYear, years, projection })
  } catch (error) {
    console.error('Error computing profitability:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
