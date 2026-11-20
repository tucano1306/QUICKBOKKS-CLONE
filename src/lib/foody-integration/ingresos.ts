import { categoryKey } from '@/lib/category-name'
import { palabrasClave } from './plantilla'

/**
 * Los ingresos que llegan de Foody: en que categoria caen y desde cuando tiene
 * sentido mandarlos.
 *
 * En Foody un ingreso es «Constructora, $1,200, 6 nov»: un nombre, sin categoria.
 * Aqui el usuario los lleva en sus categorias de ingresos («Servicios», «Uber»,
 * «Otros Ingresos»…). Lo que llega tiene que caer donde el ya los pone, o el
 * estado de resultados abre una linea nueva por cada nombre de Foody.
 *
 * Modulo PURO. Se prueba en __tests__/unit/lib/foody-ingresos.test.ts.
 */

export interface IngresoAnterior {
  id: string
  amount: number
  date: Date
  category: string
  description: string
  notes: string | null
}

/**
 * Palabras que salen en cualquier ingreso y no dicen de quien es. Las notas de
 * lo que crea Foody dicen «Desde Foody · Ingresos»: sin esto, un ingreso de
 * Foody llamado «Ingresos extra» se pareceria a todos los que ya llegaron.
 */
const COMUNES_EN_INGRESOS = new Set(['desde', 'ingreso', 'ingresos', 'cobro', 'cobros', 'cheque', 'cheques', 'deposito', 'como'])

function palabrasDeIngreso(texto: string): Set<string> {
  const todas = palabrasClave(texto)
  for (const p of COMUNES_EN_INGRESOS) todas.delete(p)
  return todas
}

/**
 * La categoria para un ingreso de Foody.
 *
 * Primero, la del ingreso mas parecido: el que comparte mas palabras del nombre
 * de Foody con su descripcion o sus notas; a igualdad, el del mismo importe y
 * luego el mas reciente. Entran tambien los que creo Foody: si el usuario
 * recategoriza uno aqui, el siguiente ya llega con lo nuevo.
 *
 * Sin ninguno parecido, la categoria que mas usa para ingresos (a igualdad, la
 * usada mas recientemente): un nombre mal escrito en Foody («Constructra» por
 * «Constructora») cae donde caen los demas en vez de estrenar categoria. Sin
 * ningun ingreso previo, `null`, y quien llama decide.
 */
export function elegirCategoriaDeIngreso(
  anteriores: readonly IngresoAnterior[],
  nombre: string,
  monto: number
): string | null {
  const conCategoria = anteriores.filter((i) => categoryKey(i.category) !== '')
  if (conCategoria.length === 0) return null

  const suyas = palabrasDeIngreso(nombre)
  let parecido: { i: IngresoAnterior; comunes: number; mismoImporte: number } | null = null
  for (const i of conCategoria) {
    const deEl = palabrasDeIngreso(`${i.description} ${i.notes ?? ''}`)
    let comunes = 0
    for (const p of suyas) if (deEl.has(p)) comunes++
    if (comunes === 0) continue
    const mismoImporte = Math.abs(i.amount - monto) < 0.005 ? 1 : 0
    if (
      !parecido ||
      comunes > parecido.comunes ||
      (comunes === parecido.comunes && mismoImporte > parecido.mismoImporte) ||
      (comunes === parecido.comunes &&
        mismoImporte === parecido.mismoImporte &&
        i.date.getTime() > parecido.i.date.getTime())
    ) {
      parecido = { i, comunes, mismoImporte }
    }
  }
  if (parecido) return parecido.i.category.trim()

  const usos = new Map<string, { veces: number; ultima: number; nombre: string }>()
  for (const i of conCategoria) {
    const clave = categoryKey(i.category)
    const previo = usos.get(clave)
    const cuando = i.date.getTime()
    if (!previo) {
      usos.set(clave, { veces: 1, ultima: cuando, nombre: i.category.trim() })
      continue
    }
    previo.veces++
    if (cuando > previo.ultima) {
      previo.ultima = cuando
      previo.nombre = i.category.trim()
    }
  }
  let masUsada: { veces: number; ultima: number; nombre: string } | null = null
  for (const u of usos.values()) {
    if (!masUsada || u.veces > masUsada.veces || (u.veces === masUsada.veces && u.ultima > masUsada.ultima)) masUsada = u
  }
  return masUsada?.nombre ?? null
}

/**
 * El dia, en Miami, de un instante: YYYY-MM-DD. Es la zona en la que vive el
 * usuario y la que usa Foody para decir a que dia pertenece cada cosa.
 */
export function diaEnMiami(instante: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante)
}
