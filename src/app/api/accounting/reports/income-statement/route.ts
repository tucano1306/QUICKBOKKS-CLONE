import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = new Date(searchParams.get('startDate') || new Date().toISOString());
    const endDate = new Date(searchParams.get('endDate') || new Date().toISOString());

    // Obtener cuentas de ingresos y gastos
    const accounts = await prisma.chartOfAccounts.findMany({
      where: {
        isActive: true,
        type: {
          in: ['REVENUE', 'EXPENSE'],
        },
      },
      include: {
        journalEntries: {
          where: {
            journalEntry: {
              date: {
                gte: startDate,
                lte: endDate,
              },
              status: 'POSTED',
            },
          },
        },
      },
    });

    const incomeStatement: any = {
      revenue: { operating: [], nonOperating: [], total: 0 },
      expenses: { operating: [], nonOperating: [], costOfSales: [], total: 0 },
      netIncome: 0,
    };

    for (const account of accounts) {
      const balance = account.journalEntries.reduce(
        (sum: number, line: any) => sum + line.credit - line.debit,
        0
      );

      const accountData = {
        code: account.code,
        name: account.name,
        balance: Math.abs(balance),
      };

      if (account.type === 'REVENUE') {
        if (account.category === 'OPERATING_REVENUE') {
          incomeStatement.revenue.operating.push(accountData);
        } else {
          incomeStatement.revenue.nonOperating.push(accountData);
        }
        incomeStatement.revenue.total += balance;
      } else if (account.type === 'EXPENSE') {
        if (account.category === 'COST_OF_GOODS_SOLD') {
          incomeStatement.expenses.costOfSales.push(accountData);
        } else if (account.category === 'OPERATING_EXPENSE') {
          incomeStatement.expenses.operating.push(accountData);
        } else {
          incomeStatement.expenses.nonOperating.push(accountData);
        }
        incomeStatement.expenses.total += Math.abs(balance);
      }
    }

    incomeStatement.netIncome = incomeStatement.revenue.total - incomeStatement.expenses.total;

    return NextResponse.json({
      period: { startDate, endDate },
      incomeStatement,
    });
  } catch (error) {
    console.error('Error generating income statement:', error);
    return NextResponse.json({ error: 'Error al generar estado de resultados' }, { status: 500 });
  }
}
