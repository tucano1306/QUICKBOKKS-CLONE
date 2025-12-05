import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Permitir acceso si hay sesión o para reportes públicos de empresa
    // if (!session) {
    //   return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    // Parámetro para elegir fuente de datos
    // Por defecto usar 'both' para incluir TODAS las fuentes (transacciones + journal entries)
    const dataSource = searchParams.get('source') || 'both'; // 'journal' | 'legacy' | 'both'
    
    const startDate = new Date(startDateStr || new Date().toISOString());
    const endDate = new Date(endDateStr || new Date().toISOString());
    endDate.setHours(23, 59, 59, 999);

    // ============================================
    // FUENTE PRINCIPAL: JOURNAL ENTRIES (Partida Doble)
    // Esta es la fuente de verdad contable
    // ============================================
    
    // Consulta directa a journal entries con filtro de fechas EXPLÍCITO
    const journalEntriesInPeriod = await prisma.journalEntry.findMany({
      where: {
        ...(companyId && { companyId }),
        date: { gte: startDate, lte: endDate },
        status: 'POSTED',
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    // Calcular ingresos y gastos desde journal entries
    const incomeByCategory: Record<string, { name: string, amount: number }> = {};
    const expensesByCategory: Record<string, { name: string, amount: number }> = {};
    
    let journalRevenue = 0;
    let journalExpenses = 0;
    
    for (const entry of journalEntriesInPeriod) {
      for (const line of entry.lines) {
        if (!line.account) continue;
        
        if (line.account.type === 'REVENUE') {
          // Revenue: balance normal es CRÉDITO
          // Créditos aumentan ingresos, Débitos los disminuyen (reversiones)
          const amount = (line.credit || 0) - (line.debit || 0);
          journalRevenue += amount; // Puede ser negativo (reversiones)
          if (!incomeByCategory[line.account.name]) {
            incomeByCategory[line.account.name] = { name: line.account.name, amount: 0 };
          }
          incomeByCategory[line.account.name].amount += amount;
        } else if (line.account.type === 'EXPENSE') {
          // Expense: balance normal es DÉBITO
          // Débitos aumentan gastos, Créditos los disminuyen (reversiones)
          const amount = (line.debit || 0) - (line.credit || 0);
          journalExpenses += amount; // Puede ser negativo (reversiones)
          if (!expensesByCategory[line.account.name]) {
            expensesByCategory[line.account.name] = { name: line.account.name, amount: 0 };
          }
          expensesByCategory[line.account.name].amount += amount;
        }
      }
    }

    // ============================================
    // FUENTE LEGACY: Transacciones sin journal entries
    // Para datos que aún no fueron migrados a partida doble
    // ============================================
    let legacyIncome = 0;
    let legacyExpenses = 0;

    if (dataSource === 'legacy' || dataSource === 'both') {
      // Transacciones sin journal entry asociado
      const transactions = await prisma.transaction.findMany({
        where: {
          ...(companyId && { companyId }),
          date: { gte: startDate, lte: endDate },
          status: 'COMPLETED'
        }
      });

      // Verificar cuáles tienen journal entry
      const txWithJE = new Set<string>();
      const journalEntries = await prisma.journalEntry.findMany({
        where: {
          ...(companyId && { companyId }),
          date: { gte: startDate, lte: endDate },
          reference: { not: null }
        },
        select: { reference: true }
      });
      journalEntries.forEach(je => je.reference && txWithJE.add(je.reference));

      // Solo contar transacciones SIN journal entry (para evitar doble conteo)
      for (const t of transactions) {
        if (!txWithJE.has(t.id)) {
          if (t.type === 'INCOME') {
            legacyIncome += t.amount || 0;
            const catName = t.category || 'Ingresos sin Categoría';
            if (!incomeByCategory[catName]) {
              incomeByCategory[catName] = { name: catName, amount: 0 };
            }
            incomeByCategory[catName].amount += t.amount || 0;
          } else if (t.type === 'EXPENSE') {
            legacyExpenses += t.amount || 0;
            const catName = t.category || 'Gastos sin Categoría';
            if (!expensesByCategory[catName]) {
              expensesByCategory[catName] = { name: catName, amount: 0 };
            }
            expensesByCategory[catName].amount += t.amount || 0;
          }
        }
      }

      // Gastos de tabla expenses sin journal entry
      const expenses = await prisma.expense.findMany({
        where: {
          ...(companyId && { companyId }),
          date: { gte: startDate, lte: endDate }
        },
        include: { category: true }
      });

      for (const exp of expenses) {
        if (!txWithJE.has(exp.id)) {
          legacyExpenses += exp.amount || 0;
          const catName = (exp.category as any)?.name || exp.vendor || 'Otros Gastos';
          if (!expensesByCategory[catName]) {
            expensesByCategory[catName] = { name: catName, amount: 0 };
          }
          expensesByCategory[catName].amount += exp.amount || 0;
        }
      }
    }

    // ============================================
    // CONSTRUIR RESPUESTA
    // ============================================
    const totalRevenue = journalRevenue + (dataSource !== 'journal' ? legacyIncome : 0);
    const totalExpenses = journalExpenses + (dataSource !== 'journal' ? legacyExpenses : 0);
    const netIncome = totalRevenue - totalExpenses;
    const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    const incomeStatement = {
      revenue: {
        operating: Object.values(incomeByCategory).filter(c => c.amount > 0).map(c => ({
          code: '',
          name: c.name,
          balance: c.amount
        })),
        nonOperating: [],
        total: totalRevenue
      },
      expenses: {
        operating: Object.values(expensesByCategory).filter(c => c.amount > 0).map(c => ({
          code: '',
          name: c.name,
          balance: c.amount
        })),
        nonOperating: [],
        costOfSales: [],
        total: totalExpenses
      },
      netIncome,
      netMargin,
      // Fuentes de datos (para auditoría)
      dataSource,
      sources: {
        journalEntries: { revenue: journalRevenue, expenses: journalExpenses },
        legacy: { income: legacyIncome, expenses: legacyExpenses }
      }
    };

    return NextResponse.json({
      period: { startDate, endDate },
      incomeStatement,
    });
  } catch (error: any) {
    console.error('Error generating income statement:', error);
    console.error('Error stack:', error?.stack);
    return NextResponse.json({ 
      error: 'Error al generar estado de resultados',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
