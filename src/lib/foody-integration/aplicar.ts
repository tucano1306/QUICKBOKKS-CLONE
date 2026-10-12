import { prisma } from '@/lib/prisma'
import { canonicalTransactionCategory } from '@/lib/transaction-category'
import { elegirDuplicado, type CandidatoManual } from './duplicados'
import { fechaDeGasto, referenciaDe, type BorradoFoody, type GastoFoody, type LoteFoody } from './lote'

/**
 * Aplica en la empresa un lote de gastos de Foody.
 *
 * Quien manda en que:
 *  - Foody manda en el IMPORTE, la FECHA y la DESCRIPCION: si el ticket se
 *    corrige alla, se corrige aqui.
 *  - Computo manda en la CATEGORIA: se pone al crear el gasto y no se vuelve a
 *    tocar. Si el usuario recategoriza aqui un gasto, la siguiente edicion en
 *    Foody no se lo deshace.
 *
 * Todo el lote va en una transaccion: o entra entero o no entra nada, y Foody
 * lo reintenta.
 */

export type AccionFoody =
  | 'creado'
  | 'actualizado'
  | 'sin_cambios'
  | 'vinculado'
  | 'borrado'
  | 'desvinculado'
  | 'no_existe'

export interface ResultadoFoody {
  ref: string
  accion: AccionFoody
  /** El id de la transaccion en Computo, cuando la hay. */
  id?: string
}

export interface ResumenFoody {
  resultados: ResultadoFoody[]
  porAccion: Partial<Record<AccionFoody, number>>
}

type Tx = Pick<typeof prisma, 'transaction'>

const UN_DIA = 86_400_000

async function candidatosManuales(tx: Tx, companyId: string, gasto: GastoFoody): Promise<CandidatoManual[]> {
  const dia = fechaDeGasto(gasto.fecha).getTime()
  const filas = await tx.transaction.findMany({
    where: {
      companyId,
      type: 'EXPENSE',
      reference: null,
      amount: { gte: gasto.monto - 0.005, lte: gasto.monto + 0.005 },
      date: { gte: new Date(dia - UN_DIA), lt: new Date(dia + 2 * UN_DIA) },
    },
    select: { id: true, amount: true, date: true, category: true, description: true },
    take: 20,
  })
  return filas
}

function mismaFecha(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)
}

async function aplicarUpsert(
  tx: Tx,
  companyId: string,
  gasto: GastoFoody,
  simular: boolean,
  enlazados: Set<string>
): Promise<ResultadoFoody> {
  const reference = referenciaDe(gasto.ref)
  const fecha = fechaDeGasto(gasto.fecha)
  const notas = gasto.notas ?? null

  const existente = await tx.transaction.findFirst({
    where: { companyId, reference },
    select: { id: true, amount: true, date: true, description: true, notes: true },
  })

  if (existente) {
    const igual =
      Math.abs(existente.amount - gasto.monto) < 0.005 &&
      mismaFecha(existente.date, fecha) &&
      existente.description === gasto.descripcion &&
      (existente.notes ?? null) === notas
    if (igual) return { ref: gasto.ref, accion: 'sin_cambios', id: existente.id }
    if (!simular) {
      await tx.transaction.update({
        where: { id: existente.id },
        data: { amount: gasto.monto, date: fecha, description: gasto.descripcion, notes: notas },
      })
    }
    return { ref: gasto.ref, accion: 'actualizado', id: existente.id }
  }

  const duplicado = elegirDuplicado(await candidatosManuales(tx, companyId, gasto), gasto, enlazados)
  if (duplicado) {
    enlazados.add(duplicado.id)
    // Se le pone la referencia y nada mas: lo tecleo el usuario y se queda
    // como lo escribio.
    if (!simular) await tx.transaction.update({ where: { id: duplicado.id }, data: { reference } })
    return { ref: gasto.ref, accion: 'vinculado', id: duplicado.id }
  }

  if (simular) return { ref: gasto.ref, accion: 'creado' }
  const categoria = await canonicalTransactionCategory(companyId, gasto.categoria)
  const creada = await tx.transaction.create({
    data: {
      companyId,
      type: 'EXPENSE',
      status: 'COMPLETED',
      category: categoria,
      amount: gasto.monto,
      date: fecha,
      description: gasto.descripcion,
      notes: notas,
      reference,
    },
    select: { id: true },
  })
  return { ref: gasto.ref, accion: 'creado', id: creada.id }
}

async function aplicarBorrado(tx: Tx, companyId: string, b: BorradoFoody, simular: boolean): Promise<ResultadoFoody> {
  const existente = await tx.transaction.findFirst({
    where: { companyId, reference: referenciaDe(b.ref) },
    select: { id: true },
  })
  if (!existente) return { ref: b.ref, accion: 'no_existe' }
  if (b.modo === 'desvincular') {
    if (!simular) await tx.transaction.update({ where: { id: existente.id }, data: { reference: null } })
    return { ref: b.ref, accion: 'desvinculado', id: existente.id }
  }
  if (!simular) await tx.transaction.delete({ where: { id: existente.id } })
  return { ref: b.ref, accion: 'borrado', id: existente.id }
}

export async function aplicarLoteFoody(companyId: string, lote: LoteFoody): Promise<ResumenFoody> {
  const simular = lote.simular === true
  const correr = async (tx: Tx) => {
    const enlazados = new Set<string>()
    const resultados: ResultadoFoody[] = []
    // Primero los borrados: si un ticket cambio de tipo, su referencia vieja se
    // va antes de que la nueva busque duplicados.
    for (const b of lote.borrar ?? []) resultados.push(await aplicarBorrado(tx, companyId, b, simular))
    for (const g of lote.upserts ?? []) resultados.push(await aplicarUpsert(tx, companyId, g, simular, enlazados))
    return resultados
  }

  const resultados = simular
    ? await correr(prisma)
    : await prisma.$transaction((tx) => correr(tx), { timeout: 30_000 })

  const porAccion: Partial<Record<AccionFoody, number>> = {}
  for (const r of resultados) porAccion[r.accion] = (porAccion[r.accion] ?? 0) + 1
  return { resultados, porAccion }
}
