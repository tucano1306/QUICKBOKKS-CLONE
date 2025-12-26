import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteTransactionWithReversal } from '@/lib/accounting-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const type = searchParams.get('type') // 'INCOME' | 'EXPENSE' | 'TRANSFER'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!companyId) {
      return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    }

    const where: any = { companyId }
    
    if (type) {
      where.type = type
    }
    
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100
    })

    // Calcular totales
    const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + (t.amount || 0), 0)
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + (t.amount || 0), 0)

    return NextResponse.json({
      transactions,
      summary: {
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        count: transactions.length
      }
    })
  } catch (error: any) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, type, category, description, amount, date, notes } = body

    if (!companyId || !type || !amount) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const txDate = date ? new Date(date) : new Date();
    const txAmount = Number.parseFloat(amount);
    const txDescription = description || category || (type === 'INCOME' ? 'Ingreso' : 'Gasto');

    // ATÓMICO: Crear transacción Y journal entry en la misma transacción de BD
    // Si falla cualquiera, se revierte completamente
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear la transacción
      const transaction = await tx.transaction.create({
        data: {
          companyId,
          type,
          category: category || (type === 'INCOME' ? 'Ingreso General' : 'Gasto General'),
          description,
          amount: txAmount,
          date: txDate,
          status: 'COMPLETED',
          notes
        }
      })

      // 2. Buscar cuentas necesarias
      const cashAccount = await tx.chartOfAccounts.findFirst({
        where: { 
          code: '1000',
          OR: [{ companyId }, { companyId: null }]
        }
      });

      if (!cashAccount) {
        throw new Error('Cuenta de Caja (1000) no encontrada. Ejecute el seed de cuentas.');
      }

      // 3. Determinar cuenta de ingreso/gasto
      let targetAccountCode: string;
      if (type === 'INCOME') {
        targetAccountCode = '4900'; // Otros Ingresos
      } else {
        // Mapear categoría a cuenta de gasto
        const categoryLower = (category || '').toLowerCase();
        if (categoryLower.includes('salario') || categoryLower.includes('payroll') || categoryLower.includes('sueldo') || categoryLower.includes('chofer')) {
          targetAccountCode = '5100'; // Salarios
        } else if (categoryLower.includes('alquiler') || categoryLower.includes('rent')) {
          targetAccountCode = '5200'; // Alquiler
        } else if (categoryLower.includes('servicio') || categoryLower.includes('utility') || categoryLower.includes('luz') || categoryLower.includes('agua')) {
          targetAccountCode = '5300'; // Servicios
        } else {
          targetAccountCode = '5900'; // Otros Gastos
        }
      }

      const targetAccount = await tx.chartOfAccounts.findFirst({
        where: { 
          code: targetAccountCode,
          OR: [{ companyId }, { companyId: null }]
        }
      });

      if (!targetAccount) {
        throw new Error(`Cuenta ${targetAccountCode} no encontrada. Ejecute el seed de cuentas.`);
      }

      // 4. Generar número de asiento único
      const year = new Date().getFullYear();
      const lastJE = await tx.journalEntry.findFirst({
        where: { 
          companyId,
          entryNumber: { startsWith: `JE-${year}-` }
        },
        orderBy: { entryNumber: 'desc' }
      });
      
      let nextNumber = 1;
      if (lastJE?.entryNumber) {
        const lastNum = Number.parseInt(lastJE.entryNumber.split('-')[2], 10);
        if (!Number.isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      }
      const entryNumber = `JE-${year}-${String(nextNumber).padStart(6, '0')}`;

      // 5. Crear Journal Entry con líneas
      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          date: txDate,
          description: `${type === 'INCOME' ? 'Ingreso' : 'Gasto'}: ${txDescription}`,
          reference: transaction.id, // Vincular con la transacción
          companyId,
          createdBy: session.user.id,
          status: 'POSTED',
          lines: {
            create: type === 'INCOME' 
              ? [
                  // Ingreso: Débito Caja, Crédito Ingresos
                  { accountId: cashAccount.id, debit: txAmount, credit: 0, description: 'Entrada de efectivo', lineNumber: 1 },
                  { accountId: targetAccount.id, debit: 0, credit: txAmount, description: txDescription, lineNumber: 2 }
                ]
              : [
                  // Gasto: Débito Gastos, Crédito Caja
                  { accountId: targetAccount.id, debit: txAmount, credit: 0, description: txDescription, lineNumber: 1 },
                  { accountId: cashAccount.id, debit: 0, credit: txAmount, description: 'Pago de gasto', lineNumber: 2 }
                ]
          }
        },
        include: { lines: true }
      });

      console.log(`✅ Transacción ${transaction.id} creada con JE ${journalEntry.entryNumber}`);
      
      return { transaction, journalEntry };
    });

    return NextResponse.json({ 
      success: true, 
      transaction: result.transaction,
      journalEntry: { entryNumber: result.journalEntry.entryNumber }
    })
  } catch (error: any) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      // Intentar leer IDs del body para eliminación múltiple
      const body = await request.json().catch(() => null)
      if (body?.ids && Array.isArray(body.ids)) {
        // Eliminar cada transacción con reversión de asiento contable
        for (const txId of body.ids) {
          await deleteTransactionWithReversal(txId, session.user.id);
        }
        return NextResponse.json({ success: true, deleted: body.ids.length })
      }
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    // Eliminar con reversión de asiento contable
    await deleteTransactionWithReversal(id, session.user.id);

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
