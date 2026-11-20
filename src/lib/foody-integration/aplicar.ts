import { prisma } from '@/lib/prisma'
import { canonicalTransactionCategory } from '@/lib/transaction-category'
import { elegirDuplicado, type CandidatoManual } from './duplicados'
import { elegirCategoriaDeIngreso } from './ingresos'
import {
  fechaDeGasto,
  referenciaDe,
  tipoDeRef,
  type BorradoFoody,
  type GastoFoody,
  type LoteFoody,
  type TipoFoody,
} from './lote'
import { aplicarBorradoNegocio, aplicarUpsertNegocio, type TxNegocio } from './aplicar-negocio'

/**
 * Aplica en la empresa un lote de gastos e ingresos de Foody.
 *
 * Quien manda en que:
 *  - Foody manda en el IMPORTE, la FECHA y la DESCRIPCION: si el ticket se
 *    corrige alla, se corrige aqui.
 *  - Computo manda en la CATEGORIA: se pone al crear la transaccion y no se
 *    vuelve a tocar. Si el usuario recategoriza aqui un gasto, la siguiente
 *    edicion en Foody no se lo deshace.
 *
 * Todo el lote va en una transaccion: o entra entero o no entra nada, y Foody
 * lo reintenta.
 *
 * Lo PERSONAL va a `transactions` de la empresa personal (abajo): los gastos
 * como EXPENSE y los ingresos (refs `income:`) como INCOME. Lo de NEGOCIO va al
 * modulo de Gastos de la empresa de negocio (aplicar-negocio.ts); si no hay
 * empresa de negocio configurada, se responde `omitido` y no se escribe en
 * ningun sitio: Foody lo guarda como pendiente y lo reintenta. Un ingreso de
 * negocio no tiene donde ir —el modulo de Gastos no es su sitio y la empresa
 * personal tampoco—, asi que se responde `omitido` siempre.
 */

const TIPO_EN_COMPUTO: Record<TipoFoody, 'EXPENSE' | 'INCOME'> = { gasto: 'EXPENSE', ingreso: 'INCOME' }

export type AccionFoody =
  | 'creado'
  | 'actualizado'
  | 'sin_cambios'
  | 'vinculado'
  | 'borrado'
  | 'desvinculado'
  | 'no_existe'
  | 'omitido'

export interface ResultadoFoody {
  ref: string
  accion: AccionFoody
  /** El id de la transaccion (o del gasto, en negocio) en Computo, cuando lo hay. */
  id?: string
  /** Por que se omitio: lo que Foody le enseña al usuario. */
  motivo?: string
  /**
   * La categoria con la que se creo (o se crearia) lo que Foody no sabe
   * clasificar: un gasto de negocio o un ingreso. Foody la enseña en la vista
   * previa.
   */
  categoria?: string
}

export interface ResumenFoody {
  resultados: ResultadoFoody[]
  porAccion: Partial<Record<AccionFoody, number>>
}

type Tx = Pick<typeof prisma, 'transaction'> & TxNegocio

const UN_DIA = 86_400_000

async function candidatosManuales(tx: Tx, companyId: string, gasto: GastoFoody): Promise<CandidatoManual[]> {
  const dia = fechaDeGasto(gasto.fecha).getTime()
  const filas = await tx.transaction.findMany({
    where: {
      companyId,
      // Un cheque de $640 nunca es el gasto de $640 que se tecleo el mismo dia.
      type: TIPO_EN_COMPUTO[tipoDeRef(gasto.ref)],
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

/** Los ingresos de la empresa que miran para clasificar uno nuevo: de sobra con los ultimos 300. */
const INGRESOS_DE_MUESTRA = 300

/**
 * La categoria de un ingreso nuevo: la que el usuario ya usa para ingresos
 * parecidos (ver ingresos.ts). Lo que manda Foody solo entra si la empresa no
 * tiene ni un ingreso todavia.
 */
async function categoriaDeIngreso(tx: Tx, companyId: string, ingreso: GastoFoody): Promise<string> {
  const anteriores = await tx.transaction.findMany({
    where: { companyId, type: 'INCOME' },
    orderBy: { date: 'desc' },
    take: INGRESOS_DE_MUESTRA,
    select: { id: true, amount: true, date: true, category: true, description: true, notes: true },
  })
  const elegida = elegirCategoriaDeIngreso(anteriores, ingreso.descripcion, ingreso.monto)
  return canonicalTransactionCategory(companyId, elegida ?? ingreso.categoria)
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

  // Un gasto llega con la categoria de Foody (la que el usuario ya usaba aqui
  // para ese tipo de compra). Un ingreso no trae ninguna: se la busca aqui, y
  // va en la respuesta para que Foody la enseñe antes de mandarlo.
  const tipo = tipoDeRef(gasto.ref)
  if (simular && tipo === 'gasto') return { ref: gasto.ref, accion: 'creado' }
  const categoria =
    tipo === 'ingreso'
      ? await categoriaDeIngreso(tx, companyId, gasto)
      : await canonicalTransactionCategory(companyId, gasto.categoria)
  if (simular) return { ref: gasto.ref, accion: 'creado', categoria }
  const creada = await tx.transaction.create({
    data: {
      companyId,
      type: TIPO_EN_COMPUTO[tipo],
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
  return tipo === 'ingreso'
    ? { ref: gasto.ref, accion: 'creado', id: creada.id, categoria }
    : { ref: gasto.ref, accion: 'creado', id: creada.id }
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

const SIN_NEGOCIO = 'Computo no tiene empresa de negocio configurada (FOODY_BUSINESS_COMPANY_ID)'
const INGRESO_DE_NEGOCIO = 'Los ingresos de negocio no entran en Computo desde Foody'

export async function aplicarLoteFoody(
  companyId: string,
  lote: LoteFoody,
  companyNegocioId: string | null = null
): Promise<ResumenFoody> {
  const simular = lote.simular === true
  const correr = async (tx: Tx) => {
    const enlazados = new Set<string>()
    const resultados: ResultadoFoody[] = []
    // Primero los borrados: si un ticket cambio de tipo (o de dueño), su
    // referencia vieja se va antes de que la nueva busque duplicados.
    for (const b of lote.borrar ?? []) {
      if (b.destino === 'negocio' && tipoDeRef(b.ref) === 'ingreso') {
        resultados.push({ ref: b.ref, accion: 'omitido', motivo: INGRESO_DE_NEGOCIO })
      } else if (b.destino !== 'negocio') resultados.push(await aplicarBorrado(tx, companyId, b, simular))
      else if (companyNegocioId) resultados.push(await aplicarBorradoNegocio(tx, companyNegocioId, b, simular))
      else resultados.push({ ref: b.ref, accion: 'omitido', motivo: SIN_NEGOCIO })
    }
    for (const g of lote.upserts ?? []) {
      if (g.destino === 'negocio' && tipoDeRef(g.ref) === 'ingreso') {
        resultados.push({ ref: g.ref, accion: 'omitido', motivo: INGRESO_DE_NEGOCIO })
      } else if (g.destino !== 'negocio') resultados.push(await aplicarUpsert(tx, companyId, g, simular, enlazados))
      else if (companyNegocioId) resultados.push(await aplicarUpsertNegocio(tx, companyNegocioId, g, simular, enlazados))
      else resultados.push({ ref: g.ref, accion: 'omitido', motivo: SIN_NEGOCIO })
    }
    return resultados
  }

  const resultados = simular
    ? await correr(prisma)
    : await prisma.$transaction((tx) => correr(tx), { timeout: 30_000 })

  const porAccion: Partial<Record<AccionFoody, number>> = {}
  for (const r of resultados) porAccion[r.accion] = (porAccion[r.accion] ?? 0) + 1
  return { resultados, porAccion }
}
