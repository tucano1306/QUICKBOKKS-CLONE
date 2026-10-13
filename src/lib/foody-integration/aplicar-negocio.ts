import { prisma } from '@/lib/prisma'
import { deleteExpenseWithReversal } from '@/lib/accounting-service'
import { crearAsientoDeGasto, sincronizarAsientoDeGasto } from '@/lib/expense-journal'
import { elegirDuplicado, type CandidatoManual } from './duplicados'
import { referenciaDe, type BorradoFoody, type GastoFoody } from './lote'
import { categoriaDeRespaldo, elegirPlantilla, type GastoAnterior } from './plantilla'
import type { ResultadoFoody } from './aplicar'

/**
 * Los gastos de NEGOCIO de Foody, en el modulo de Gastos (`expenses`) de la
 * empresa de negocio.
 *
 * No van a `transactions` como los personales porque la empresa de negocio no
 * los lleva ahi: lleva sus gastos en el modulo de Gastos, con proveedor,
 * categoria propia y metodo de pago, y es ahi donde el usuario los teclea cada
 * mes. Lo que llega de Foody tiene que quedar igual que lo tecleado.
 *
 * Quien manda en que:
 *  - Foody manda en el IMPORTE y la FECHA.
 *  - Computo manda en todo lo demas: al crear se copia del ultimo gasto
 *    parecido (plantilla.ts) y despues no se vuelve a tocar.
 */

export type TxNegocio = Pick<
  typeof prisma,
  'expense' | 'expenseCategory' | 'companyUser' | 'chartOfAccounts' | 'journalEntry' | 'journalEntryLine'
>

const UN_DIA = 86_400_000

/**
 * El dia del gasto como lo guarda el formulario de Gastos: a mediodia, para
 * que ninguna zona horaria lo cambie de dia.
 */
export function fechaDeGastoNegocio(fecha: string): Date {
  return new Date(`${fecha}T12:00:00.000Z`)
}

function mismoDia(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)
}

/** Lo tecleado a mano lleva la referencia vacia (''), no nula. */
const SIN_REFERENCIA = [{ reference: null }, { reference: '' }]

async function candidatosManuales(tx: TxNegocio, companyId: string, gasto: GastoFoody): Promise<CandidatoManual[]> {
  const dia = new Date(`${gasto.fecha}T00:00:00.000Z`).getTime()
  const filas = await tx.expense.findMany({
    where: {
      companyId,
      OR: SIN_REFERENCIA,
      amount: { gte: gasto.monto - 0.005, lte: gasto.monto + 0.005 },
      date: { gte: new Date(dia - UN_DIA), lt: new Date(dia + 2 * UN_DIA) },
    },
    select: { id: true, amount: true, date: true, description: true, vendor: true, category: { select: { name: true } } },
    take: 20,
  })
  return filas.map((f) => ({
    id: f.id,
    amount: f.amount,
    date: f.date,
    category: f.category?.name ?? '',
    description: `${f.vendor ?? ''} ${f.description}`.trim(),
  }))
}

async function gastosAnteriores(tx: TxNegocio, companyId: string): Promise<GastoAnterior[]> {
  return tx.expense.findMany({
    where: { companyId },
    orderBy: { date: 'desc' },
    take: 300,
    select: {
      id: true,
      amount: true,
      date: true,
      categoryId: true,
      description: true,
      vendor: true,
      paymentMethod: true,
      taxDeductible: true,
      userId: true,
    },
  })
}

/** Quien «firma» el gasto si no hay plantilla: el dueño de la empresa, o el primero que entro. */
async function usuarioDeLaEmpresa(tx: TxNegocio, companyId: string): Promise<string | null> {
  const cu = await tx.companyUser.findFirst({
    where: { companyId },
    orderBy: [{ isOwner: 'desc' }, { createdAt: 'asc' }],
    select: { userId: true },
  })
  return cu?.userId ?? null
}

export async function aplicarUpsertNegocio(
  tx: TxNegocio,
  companyId: string,
  gasto: GastoFoody,
  simular: boolean,
  enlazados: Set<string>
): Promise<ResultadoFoody> {
  const reference = referenciaDe(gasto.ref)
  const fecha = fechaDeGastoNegocio(gasto.fecha)
  const notas = gasto.notas ?? null

  const existente = await tx.expense.findFirst({
    where: { companyId, reference },
    select: { id: true, amount: true, date: true, notes: true },
  })

  if (existente) {
    const mismoImporte = Math.abs(existente.amount - gasto.monto) < 0.005
    const igualDia = mismoDia(existente.date, fecha)
    if (mismoImporte && igualDia && (existente.notes ?? null) === notas) {
      return { ref: gasto.ref, accion: 'sin_cambios', id: existente.id }
    }
    if (!simular) {
      await tx.expense.update({ where: { id: existente.id }, data: { amount: gasto.monto, date: fecha, notes: notas } })
      await sincronizarAsientoDeGasto(tx, existente.id, {
        amount: mismoImporte ? undefined : gasto.monto,
        date: igualDia ? undefined : fecha,
      })
    }
    return { ref: gasto.ref, accion: 'actualizado', id: existente.id }
  }

  const duplicado = elegirDuplicado(await candidatosManuales(tx, companyId, gasto), gasto, enlazados)
  if (duplicado) {
    enlazados.add(duplicado.id)
    // Lo tecleo el usuario: se le pone la referencia y se queda como esta.
    if (!simular) await tx.expense.update({ where: { id: duplicado.id }, data: { reference } })
    return { ref: gasto.ref, accion: 'vinculado', id: duplicado.id }
  }

  const plantilla = elegirPlantilla(await gastosAnteriores(tx, companyId), gasto.descripcion, gasto.monto)
  const categorias = plantilla
    ? []
    : await tx.expenseCategory.findMany({
        where: { OR: [{ companyId }, { companyId: null }] },
        select: { id: true, name: true, companyId: true },
      })
  const categoryId = plantilla?.categoryId ?? categoriaDeRespaldo(categorias)
  if (!categoryId) {
    return { ref: gasto.ref, accion: 'omitido', motivo: 'La empresa de negocio no tiene ninguna categoria de gastos' }
  }
  const userId = plantilla?.userId ?? (await usuarioDeLaEmpresa(tx, companyId))
  if (!userId) {
    return { ref: gasto.ref, accion: 'omitido', motivo: 'La empresa de negocio no tiene usuarios' }
  }

  const categoria = await tx.expenseCategory.findUnique({ where: { id: categoryId }, select: { name: true } })
  const descripcion = plantilla?.description ?? gasto.descripcion
  if (simular) return { ref: gasto.ref, accion: 'creado', categoria: categoria?.name }

  const creado = await tx.expense.create({
    data: {
      userId,
      companyId,
      categoryId,
      amount: gasto.monto,
      date: fecha,
      description: descripcion,
      vendor: plantilla ? plantilla.vendor : gasto.descripcion,
      // Sin plantilla no se sabe como se pago: OTHER antes que inventarlo.
      paymentMethod: (plantilla?.paymentMethod as 'CASH' | 'TRANSFER' | 'CARD' | 'CHECK' | 'OTHER') ?? 'OTHER',
      reference,
      taxDeductible: plantilla?.taxDeductible ?? true,
      taxAmount: 0,
      notes: notas,
      attachments: [],
      // Foody lo manda cuando el pago ya se hizo.
      status: 'PAID',
    },
    select: { id: true },
  })
  await crearAsientoDeGasto(tx, {
    expenseId: creado.id,
    companyId,
    userId,
    amount: gasto.monto,
    date: fecha,
    description: descripcion,
    categoryName: categoria?.name,
  })
  return { ref: gasto.ref, accion: 'creado', id: creado.id, categoria: categoria?.name }
}

export async function aplicarBorradoNegocio(
  tx: TxNegocio,
  companyId: string,
  b: BorradoFoody,
  simular: boolean
): Promise<ResultadoFoody> {
  const existente = await tx.expense.findFirst({
    where: { companyId, reference: referenciaDe(b.ref) },
    select: { id: true, userId: true },
  })
  if (!existente) return { ref: b.ref, accion: 'no_existe' }
  if (b.modo === 'desvincular') {
    if (!simular) await tx.expense.update({ where: { id: existente.id }, data: { reference: null } })
    return { ref: b.ref, accion: 'desvinculado', id: existente.id }
  }
  // Con su contra-asiento, como cuando se borra desde la pantalla de Gastos.
  if (!simular) await deleteExpenseWithReversal(existente.id, existente.userId, tx)
  return { ref: b.ref, accion: 'borrado', id: existente.id }
}
