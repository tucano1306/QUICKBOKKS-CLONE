import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener companyId del usuario
    const companyUser = await prisma.companyUser.findFirst({
      where: { userId: session.user.id },
      select: { companyId: true }
    });

    if (!companyUser?.companyId) {
      return NextResponse.json({ error: 'Usuario no asociado a empresa' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = new Date(searchParams.get('startDate') || new Date().toISOString());
    const endDate = new Date(searchParams.get('endDate') || new Date().toISOString());

    // Obtener solo cuentas de la empresa del usuario
    const accounts = await prisma.chartOfAccounts.findMany({
      where: { 
        isActive: true,
        companyId: companyUser.companyId  // CRITICAL: Filter by company
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

    // Calcular balances - IMPORTANTE: Usar balance normal correcto para cada tipo de cuenta
    // ASSETS: balance normal = DÉBITO (debit - credit = positivo)
    // LIABILITIES: balance normal = CRÉDITO (credit - debit = positivo)
    // EQUITY: balance normal = CRÉDITO (credit - debit = positivo)
    const balanceSheet: any = {
      assets: { current: [], fixed: [], total: 0 },
      liabilities: { current: [], longTerm: [], total: 0 },
      equity: { accounts: [], total: 0 },
    };

    for (const account of accounts) {
      // Calcular balance según el tipo de cuenta
      let balance: number;
      if (account.type === 'ASSET') {
        // Assets have debit normal balance
        balance = account.journalEntries.reduce(
          (sum, line) => sum + line.debit - line.credit, 0
        );
      } else {
        // Liabilities and Equity have credit normal balance
        balance = account.journalEntries.reduce(
          (sum, line) => sum + line.credit - line.debit, 0
        );
      }

      const accountData = {
        code: account.code,
        name: account.name,
        balance: Math.abs(balance), // Always show positive for display
        normalBalance: balance, // Keep original for calculations
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
