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

    // Flujo de operación
    // IMPORTANTE: Para cash flow, usar paidDate (cuando se recibió el dinero), no issueDate
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId: companyUser.companyId,
        status: 'PAID',
        // Use paidDate for cash basis, fallback to issueDate if paidDate not available
        OR: [
          { paidDate: { gte: startDate, lte: endDate } },
          { paidDate: null, issueDate: { gte: startDate, lte: endDate } }
        ]
      },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        companyId: companyUser.companyId,
        date: { gte: startDate, lte: endDate },
        status: 'PAID',
      },
    });

    const operatingInflow = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const operatingOutflow = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netOperatingCashFlow = operatingInflow - operatingOutflow;

    // Flujo de inversión
    const assetPurchases = await prisma.asset.findMany({
      where: {
        purchaseDate: { gte: startDate, lte: endDate },
      },
    });

    const assetDisposals = await prisma.asset.findMany({
      where: {
        disposalDate: { gte: startDate, lte: endDate },
      },
    });

    const investmentOutflow = assetPurchases.reduce((sum, asset) => sum + asset.purchasePrice, 0);
    const investmentInflow = assetDisposals.reduce((sum, asset) => sum + (asset.disposalPrice || 0), 0);
    const netInvestingCashFlow = investmentInflow - investmentOutflow;

    // Flujo de financiamiento
    const bankTransactions = await prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        description: {
          contains: 'préstamo',
        },
      },
    });

    const financingInflow = bankTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum: number, t) => sum + t.amount, 0);

    const financingOutflow = bankTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum: number, t) => sum + t.amount, 0);

    const netFinancingCashFlow = financingInflow - financingOutflow;

    // Flujo total
    const netCashFlow = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;

    // Saldo inicial y final de efectivo
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { status: 'ACTIVE' },
    });

    const currentCashBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    return NextResponse.json({
      period: { startDate, endDate },
      cashFlow: {
        operating: {
          inflow: operatingInflow,
          outflow: operatingOutflow,
          net: netOperatingCashFlow,
        },
        investing: {
          inflow: investmentInflow,
          outflow: investmentOutflow,
          net: netInvestingCashFlow,
        },
        financing: {
          inflow: financingInflow,
          outflow: financingOutflow,
          net: netFinancingCashFlow,
        },
        netCashFlow,
        currentCashBalance,
      },
    });
  } catch (error) {
    console.error('Error generating cash flow:', error);
    return NextResponse.json({ error: 'Error al generar flujo de efectivo' }, { status: 500 });
  }
}
