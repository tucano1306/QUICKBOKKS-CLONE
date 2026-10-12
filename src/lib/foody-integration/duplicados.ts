import { categoryKey } from '@/lib/category-name'
import type { GastoFoody } from './lote'

/**
 * ¿Este gasto de Foody ya lo habia tecleado el usuario a mano en Computo?
 *
 * Hasta ahora cada ticket se metia dos veces —en Foody y aqui— y al encender
 * la integracion convivira un tiempo con lo tecleado. Un Publix de $20.68 del
 * 6 sep que ya esta en «Supermercado» no debe aparecer dos veces: se ENLAZA
 * (se le pone la referencia de Foody) en vez de crear otro.
 *
 * Reglas, de mas a menos estrictas:
 *  - el importe tiene que ser el mismo, al centavo;
 *  - la fecha, la misma o un dia de diferencia (lo tecleado a mano a veces
 *    lleva el dia en que se apunto, no el de la compra);
 *  - entre varios candidatos gana el que comparte categoria, luego el que
 *    comparte palabras en la descripcion («Publix», «Mobil»), luego el de la
 *    fecha mas cercana.
 *
 * Sin coincidencia de importe y fecha no se enlaza nada: crear un gasto de mas
 * se ve y se borra; enlazar el equivocado esconde un gasto real.
 */

export interface CandidatoManual {
  id: string
  amount: number
  date: Date
  category: string
  description: string
}

const UN_DIA = 86_400_000

function diaDe(fecha: Date): number {
  return Math.floor(fecha.getTime() / UN_DIA)
}

function palabras(texto: string): Set<string> {
  return new Set(
    texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length >= 3)
  )
}

export function elegirDuplicado(
  candidatos: readonly CandidatoManual[],
  gasto: GastoFoody,
  yaUsados: ReadonlySet<string> = new Set()
): CandidatoManual | null {
  const dia = diaDe(new Date(`${gasto.fecha}T00:00:00.000Z`))
  const clave = categoryKey(gasto.categoria)
  const suyas = palabras(gasto.descripcion)

  let mejor: { c: CandidatoManual; puntos: number; distancia: number } | null = null
  for (const c of candidatos) {
    if (yaUsados.has(c.id)) continue
    if (Math.abs(c.amount - gasto.monto) >= 0.005) continue
    const distancia = Math.abs(diaDe(c.date) - dia)
    if (distancia > 1) continue

    let puntos = 0
    if (categoryKey(c.category) === clave) puntos += 2
    for (const p of palabras(c.description)) {
      if (suyas.has(p)) {
        puntos += 1
        break
      }
    }

    if (
      !mejor ||
      puntos > mejor.puntos ||
      (puntos === mejor.puntos && distancia < mejor.distancia) ||
      (puntos === mejor.puntos && distancia === mejor.distancia && c.id < mejor.c.id)
    ) {
      mejor = { c, puntos, distancia }
    }
  }
  return mejor?.c ?? null
}
