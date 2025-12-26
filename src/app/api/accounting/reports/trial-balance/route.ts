import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Permitir sin sesión para API calls internas
    // if (!session) {
    //   return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const dateStr = searchParams.get('date');
    
    const asOfDate = dateStr ? new Date(dateStr) : new Date();
    asOfDate.setHours(23, 59, 59, 999);

    // Obtener todas las cuentas con sus movimientos
    const accounts = await prisma.chartOfAccounts.findMany({
      where: {
        ...(companyId && { companyId }),
        isActive: true
      },
      include: {
        journalEntries: {
          where: {
            journalEntry: {
              date: { lte: asOfDate },
              status: 'POSTED'
            }
          }
        }
      },
      orderBy: [
        { type: 'asc' },
        { code: 'asc' }
      ]
    });

    // Obtener transacciones para incluir en el balance
    const transactions = await prisma.transaction.findMany({
      where: {
        ...(companyId && { companyId }),
        date: { lte: asOfDate },
        status: 'COMPLETED'
      }
    });

    // Obtener gastos
    let expenses: any[] = [];
    try {
      expenses = await prisma.expense.findMany({
        where: {
          ...(companyId && { companyId }),
          date: { lte: asOfDate }
        }
      });
    } catch (e) {
      // Tabla puede no existir
    }

    // Calcular balance de prueba
    interface TrialBalanceItem {
      code: string;
      name: string;
      type: string;
      debit: number;
      credit: number;
    }

    const trialBalance: TrialBalanceItem[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    // Procesar cuentas del catálogo
    for (const account of accounts) {
      let debit = 0;
      let credit = 0;

      // Sumar asientos contables
      for (const entry of account.journalEntries) {
        debit += entry.debit || 0;
        credit += entry.credit || 0;
      }

      // Agregar transacciones según tipo de cuenta
      if (account.type === 'REVENUE') {
        // Ingresos van al crédito
        const incomeTotal = transactions
          .filter(t => t.type === 'INCOME' && (t.category === account.name || !t.category))
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        credit += incomeTotal;
      } else if (account.type === 'EXPENSE') {
        // Gastos van al débito
        const expenseFromTx = transactions
          .filter(t => t.type === 'EXPENSE' && (t.category === account.name || !t.category))
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        debit += expenseFromTx;
      }

      const balance = debit - credit;
      
      if (debit !== 0 || credit !== 0) {
        trialBalance.push({
          code: account.code,
          name: account.name,
          type: account.type,
          debit: balance > 0 ? Math.abs(balance) : 0,
          credit: balance < 0 ? Math.abs(balance) : 0
        });

        if (balance > 0) {
          totalDebits += Math.abs(balance);
        } else {
          totalCredits += Math.abs(balance);
        }
      }
    }

    // Si hay transacciones sin cuenta asignada, crear líneas genéricas
    const unassignedIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const unassignedExpenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const expenseTableTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    if (unassignedIncome > 0) {
      trialBalance.push({
        code: '4000',
        name: 'Ingresos (Transacciones)',
        type: 'REVENUE',
        debit: 0,
        credit: unassignedIncome
      });
      totalCredits += unassignedIncome;
    }

    if (unassignedExpenses > 0 || expenseTableTotal > 0) {
      trialBalance.push({
        code: '5000',
        name: 'Gastos (Transacciones/Expenses)',
        type: 'EXPENSE',
        debit: unassignedExpenses + expenseTableTotal,
        credit: 0
      });
      totalDebits += unassignedExpenses + expenseTableTotal;
    }

    // Ordenar por código
    trialBalance.sort((a, b) => a.code.localeCompare(b.code));

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    return NextResponse.json({
      asOfDate: asOfDate.toISOString(),
      accounts: trialBalance,
      totals: {
        debits: totalDebits,
        credits: totalCredits,
        difference: totalDebits - totalCredits,
        isBalanced
      }
    });

  } catch (error: any) {
    console.error('Error generating trial balance:', error);
    return NextResponse.json({ 
      error: 'Error al generar balance de prueba',
      details: error?.message 
    }, { status: 500 });
  }
}
