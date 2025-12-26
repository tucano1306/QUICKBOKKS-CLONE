import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  generateAnalyticalLedger,
  generateDetailedTrialBalance,
  generateLegalJournal,
  reconcileCreditAccount,
  autoMatchCreditTransactions,
  searchByCheckNumber,
  reclassifyTransaction,
  bulkReclassifyTransactions,
} from '@/lib/advanced-accounting-service';

export const dynamic = 'force-dynamic'

/**
 * GET /api/advanced-reports?type=analytical-ledger&accountId=xxx&startDate=...&endDate=...
 * Genera reportes contables avanzados
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const accountId = searchParams.get('accountId');
    const startDate = new Date(searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const endDate = new Date(searchParams.get('endDate') || new Date());
    const checkNumber = searchParams.get('checkNumber');

    switch (type) {
      case 'analytical-ledger':
        if (!accountId) {
          return NextResponse.json({ error: 'Se requiere seleccionar una cuenta para generar el Mayor Analítico' }, { status: 400 });
        }
        const ledger = await generateAnalyticalLedger(accountId, startDate, endDate);
        return NextResponse.json(ledger);

      case 'trial-balance':
        const trialBalance = await generateDetailedTrialBalance(session.user.id, startDate, endDate);
        return NextResponse.json(trialBalance);

      case 'legal-journal':
        const legalJournal = await generateLegalJournal(session.user.id, startDate, endDate);
        return NextResponse.json(legalJournal);

      case 'check-search':
        if (!checkNumber) {
          return NextResponse.json({ error: 'Se requiere ingresar un número de cheque' }, { status: 400 });
        }
        const results = await searchByCheckNumber(session.user.id, checkNumber);
        return NextResponse.json(results);

      default:
        return NextResponse.json({ error: 'Tipo de reporte no válido. Tipos válidos: analytical-ledger, trial-balance, legal-journal, check-search' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error generando reporte avanzado:', error);
    return NextResponse.json({ error: error.message || 'Error generando reporte' }, { status: 500 });
  }
}

/**
 * POST /api/advanced-reports
 * Ejecuta acciones avanzadas
 * 
 * Body:
 * {
 *   "action": "reconcile-credit" | "auto-match-credit" | "reclassify" | "bulk-reclassify",
 *   ...params
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'reconcile-credit':
        const { bankAccountId, statementDate, statementBalance } = body;
        if (!bankAccountId || !statementDate || statementBalance === undefined) {
          return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 });
        }
        const reconciliation = await reconcileCreditAccount(
          bankAccountId,
          new Date(statementDate),
          statementBalance
        );
        return NextResponse.json(reconciliation);

      case 'auto-match-credit':
        const { accountId, tolerance } = body;
        if (!accountId) {
          return NextResponse.json({ error: 'Se requiere accountId' }, { status: 400 });
        }
        const matchedCount = await autoMatchCreditTransactions(accountId, tolerance);
        return NextResponse.json({ matchedCount });

      case 'reclassify':
        const { journalEntryLineId, newAccountId, reason } = body;
        if (!journalEntryLineId || !newAccountId || !reason) {
          return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 });
        }
        await reclassifyTransaction(journalEntryLineId, newAccountId, reason, session.user.id);
        return NextResponse.json({ success: true });

      case 'bulk-reclassify':
        const { reclassifications } = body;
        if (!reclassifications || !Array.isArray(reclassifications)) {
          return NextResponse.json({ error: 'Se requiere array de reclassifications' }, { status: 400 });
        }
        const result = await bulkReclassifyTransactions(reclassifications, session.user.id);
        return NextResponse.json(result);

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error ejecutando acción avanzada:', error);
    return NextResponse.json({ error: error.message || 'Error ejecutando acción' }, { status: 500 });
  }
}
