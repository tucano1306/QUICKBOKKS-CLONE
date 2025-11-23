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

    // Obtener todas las cuentas con sus movimientos
    const accounts = await prisma.chartOfAccounts.findMany({
      where: { isActive: true },
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

    // Calcular balances
    const balanceSheet: any = {
      assets: { current: [], fixed: [], total: 0 },
      liabilities: { current: [], longTerm: [], total: 0 },
      equity: { accounts: [], total: 0 },
    };

    for (const account of accounts) {
      const balance = account.journalEntries.reduce(
        (sum, line) => sum + line.debit - line.credit,
        0
      );

      const accountData = {
        code: account.code,
        name: account.name,
        balance,
      };

      if (account.type === 'ASSET') {
        if (account.category === 'CURRENT_ASSET') {
          balanceSheet.assets.current.push(accountData);
        } else {
          balanceSheet.assets.fixed.push(accountData);
        }
        balanceSheet.assets.total += balance;
      } else if (account.type === 'LIABILITY') {
        if (account.category === 'CURRENT_LIABILITY') {
          balanceSheet.liabilities.current.push(accountData);
        } else {
          balanceSheet.liabilities.longTerm.push(accountData);
        }
        balanceSheet.liabilities.total += balance;
      } else if (account.type === 'EQUITY') {
        balanceSheet.equity.accounts.push(accountData);
        balanceSheet.equity.total += balance;
      }
    }

    return NextResponse.json({
      period: { startDate, endDate },
      balanceSheet,
      totalAssets: balanceSheet.assets.total,
      totalLiabilitiesAndEquity: balanceSheet.liabilities.total + balanceSheet.equity.total,
    });
  } catch (error) {
    console.error('Error generating balance sheet:', error);
    return NextResponse.json({ error: 'Error al generar balance general' }, { status: 500 });
  }
}
