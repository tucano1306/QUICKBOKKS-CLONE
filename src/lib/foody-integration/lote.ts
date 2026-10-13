import { z } from 'zod'

/**
 * Lo que Foody manda: el estado deseado de sus gastos, no una lista de eventos.
 *
 * `ref` identifica cada gasto en Foody (un tramo de un ticket, o el pago de un
 * recibo) y se guarda en `Transaction.reference` como `foody:<ref>`. Con eso
 * cada envio es idempotente: mandar dos veces lo mismo no crea dos gastos.
 */

const REF = /^(trip|payment):[A-Za-z0-9:_-]{1,110}$/
const FECHA = /^\d{4}-\d{2}-\d{2}$/

/**
 * De quien es el gasto. En Foody cada ticket y cada pago lleva su parte de
 * negocio (`business_share`): lo personal entra en la empresa personal
 * (FOODY_COMPANY_ID, «Leonardo») y lo de negocio en la de negocio
 * (FOODY_BUSINESS_COMPANY_ID, «Venecoro»). El pago de la Suburban no tiene
 * nada que hacer en las cuentas de casa.
 */
export const destinoFoodySchema = z.enum(['personal', 'negocio']).default('personal')

export const gastoFoodySchema = z.object({
  ref: z.string().regex(REF),
  fecha: z.string().regex(FECHA),
  monto: z.number().positive().max(10_000_000),
  categoria: z.string().trim().min(1).max(80),
  descripcion: z.string().trim().min(1).max(200),
  notas: z.string().max(500).optional(),
  destino: destinoFoodySchema,
})

export const borradoFoodySchema = z.object({
  ref: z.string().regex(REF),
  /**
   * `desvincular` para los gastos que el usuario ya tenia tecleados a mano y
   * Foody solo enlazo: si se borran en Foody, en Computo se quedan, porque los
   * escribio el. `borrar`, para los que creo Foody.
   */
  modo: z.enum(['borrar', 'desvincular']),
  destino: destinoFoodySchema,
})

/** `{ ping: true }`: comprobar la conexion sin tocar nada. */
export const pingFoodySchema = z.object({ ping: z.literal(true) }).strict()

export const loteFoodySchema = z.object({
  upserts: z.array(gastoFoodySchema).max(200).default([]),
  borrar: z.array(borradoFoodySchema).max(200).default([]),
  /** Calcula lo que pasaria sin escribir nada: la vista previa de Foody. */
  simular: z.boolean().default(false),
})

export type GastoFoody = z.infer<typeof gastoFoodySchema>
export type BorradoFoody = z.infer<typeof borradoFoodySchema>
export type LoteFoody = z.infer<typeof loteFoodySchema>
export type DestinoFoody = z.infer<typeof destinoFoodySchema>

export const PREFIJO_REFERENCIA = 'foody:'

export function referenciaDe(ref: string): string {
  return `${PREFIJO_REFERENCIA}${ref}`
}

/** La fecha de un gasto como la guarda Computo: el dia, a las 00:00. */
export function fechaDeGasto(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`)
}
