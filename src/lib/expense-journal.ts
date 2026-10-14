import type { Prisma } from '@prisma/client'

/**
 * El asiento contable de un gasto del modulo de Gastos.
 *
 * Vivia dentro de las rutas de /api/expenses. Se saca aqui para que la
 * integracion con Foody cree y corrija los gastos exactamente igual que el
 * formulario: el dia que haya plan de cuentas, lo que llega de Foody sale en el
 * estado de resultados igual que lo tecleado a mano, y no por otro camino.
 *
 * Todas reciben el cliente (`prisma` o el `tx` de una transaccion) para poder
 * ir dentro de la misma transaccion que el gasto.
 */
type DbAsiento = Pick<Prisma.TransactionClient, 'chartOfAccounts' | 'journalEntry' | 'journalEntryLine'>

/** La cuenta de gasto que le toca a una categoria. */
export function cuentaDeGasto(categoryName: string): string {
  const categoryLower = categoryName.toLowerCase()

  if (categoryLower.includes('salario') || categoryLower.includes('chofer') || categoryLower.includes('sueldo')) {
    return '5100'
  }
  if (categoryLower.includes('alquiler') || categoryLower.includes('rent')) {
    return '5200'
  }
  if (categoryLower.includes('servicio') || categoryLower.includes('luz') || categoryLower.includes('agua')) {
    return '5300'
  }
  return '5900' // Otros Gastos por defecto
}

async function siguienteNumeroDeAsiento(db: DbAsiento, companyId: string): Promise<string> {
  const year = new Date().getFullYear()
  const lastJE = await db.journalEntry.findFirst({
    where: {
      companyId,
      entryNumber: { startsWith: `JE-${year}-` },
    },
    orderBy: { entryNumber: 'desc' },
  })

  let nextNumber = 1
  if (lastJE?.entryNumber) {
    const lastNum = Number.parseInt(lastJE.entryNumber.split('-')[2], 10)
    if (!Number.isNaN(lastNum)) {
      nextNumber = lastNum + 1
    }
  }
  return `JE-${year}-${String(nextNumber).padStart(6, '0')}`
}

export interface DatosAsientoDeGasto {
  expenseId: string
  companyId: string
  userId: string
  amount: number
  date: Date
  description?: string | null
  categoryName?: string | null
}

/**
 * Debe en la cuenta del gasto, haber en Caja (1000). Sin esas cuentas en el
 * plan no hay asiento y el gasto se queda como esta, igual que en el
 * formulario. Devuelve el numero de asiento, o `null` si no se creo.
 */
export async function crearAsientoDeGasto(db: DbAsiento, datos: DatosAsientoDeGasto): Promise<string | null> {
  const categoryName = datos.categoryName || 'General'
  const companyId = datos.companyId

  const cashAccount = await db.chartOfAccounts.findFirst({
    where: {
      code: '1000',
      OR: [{ companyId }, { companyId: null }],
    },
  })
  if (!cashAccount) {
    console.warn('⚠️ Cuenta de Caja (1000) no encontrada, gasto creado sin journal entry')
    return null
  }

  const expenseAccountCode = cuentaDeGasto(categoryName)
  const expenseAccount = await db.chartOfAccounts.findFirst({
    where: {
      code: expenseAccountCode,
      OR: [{ companyId }, { companyId: null }],
    },
  })
  if (!expenseAccount) {
    console.warn(`⚠️ Cuenta de gastos (${expenseAccountCode}) no encontrada, gasto creado sin journal entry`)
    return null
  }

  const entryNumber = await siguienteNumeroDeAsiento(db, companyId)
  await db.journalEntry.create({
    data: {
      entryNumber,
      date: datos.date,
      description: `Gasto: ${datos.description || categoryName}`,
      reference: datos.expenseId,
      companyId,
      createdBy: datos.userId,
      status: 'POSTED',
      lines: {
        create: [
          {
            accountId: expenseAccount.id,
            debit: datos.amount,
            credit: 0,
            description: datos.description || categoryName,
            lineNumber: 1,
          },
          { accountId: cashAccount.id, debit: 0, credit: datos.amount, description: 'Pago de gasto', lineNumber: 2 },
        ],
      },
    },
  })
  return entryNumber
}

/**
 * Si el gasto cambia de importe o de fecha, su asiento tambien: el P&L sale de
 * los asientos, no de los gastos. Devuelve el numero del asiento tocado, o
 * `null` si no habia.
 */
export async function sincronizarAsientoDeGasto(
  db: DbAsiento,
  expenseId: string,
  cambios: { amount?: number; date?: Date }
): Promise<string | null> {
  if (cambios.amount === undefined && cambios.date === undefined) return null

  const journalEntry = await db.journalEntry.findFirst({
    where: { reference: expenseId },
    include: { lines: true },
  })
  if (!journalEntry) return null

  if (cambios.date) {
    await db.journalEntry.update({
      where: { id: journalEntry.id },
      data: { date: cambios.date },
    })
  }

  if (cambios.amount !== undefined) {
    for (const line of journalEntry.lines) {
      await db.journalEntryLine.update({
        where: { id: line.id },
        data: {
          debit: line.debit > 0 ? cambios.amount : 0,
          credit: line.credit > 0 ? cambios.amount : 0,
        },
      })
    }
  }
  return journalEntry.entryNumber
}
