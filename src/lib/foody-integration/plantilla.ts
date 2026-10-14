/**
 * ¿Como apunta el usuario este gasto en el modulo de Gastos?
 *
 * En la empresa de negocio cada pago se teclea igual mes tras mes: la cuota de
 * la Suburban va a «Vehiculo» con «Pago de la suburban» y proveedor «GMC»; el
 * seguro, a «Seguro Geico» con proveedor «Cable Insurance». Foody solo sabe
 * «GMC, $1,097». Para que lo que llega se vea como lo que el usuario escribe,
 * se copia del ultimo gasto parecido de la empresa: categoria, descripcion,
 * proveedor y metodo de pago.
 *
 * «Parecido» quiere decir que comparte alguna palabra del nombre en Foody con
 * el proveedor o la descripcion. Entre varios gana el que comparte mas
 * palabras, luego el del mismo importe y luego el mas reciente; asi, si el
 * usuario recategoriza aqui un gasto, el mes siguiente ya llega con lo nuevo.
 * El importe solo no basta para elegir: dos pagos de $300 no tienen por que
 * ser lo mismo.
 *
 * Modulo PURO. Se prueba en __tests__/unit/lib/foody-plantilla.test.ts.
 */

export interface GastoAnterior {
  id: string
  amount: number
  date: Date
  categoryId: string
  description: string
  vendor: string | null
  paymentMethod: string
  taxDeductible: boolean
  userId: string
}

/** Palabras que aparecen en todo y no distinguen un gasto de otro. */
const VACIAS = new Set(['pago', 'pagos', 'del', 'las', 'los', 'por', 'para', 'con', 'una', 'the', 'and', 'foody'])

export function palabrasClave(texto: string): Set<string> {
  return new Set(
    texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      // «Larry's» y «Larrys» son el mismo proveedor.
      .replace(/['’`]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length >= 3 && !VACIAS.has(p))
  )
}

export function elegirPlantilla(
  anteriores: readonly GastoAnterior[],
  nombre: string,
  monto: number
): GastoAnterior | null {
  const suyas = palabrasClave(nombre)
  if (suyas.size === 0) return null

  let mejor: { g: GastoAnterior; comunes: number; mismoImporte: number } | null = null
  for (const g of anteriores) {
    const deEl = palabrasClave(`${g.vendor ?? ''} ${g.description}`)
    let comunes = 0
    for (const p of suyas) if (deEl.has(p)) comunes++
    if (comunes === 0) continue
    const mismoImporte = Math.abs(g.amount - monto) < 0.005 ? 1 : 0

    if (
      !mejor ||
      comunes > mejor.comunes ||
      (comunes === mejor.comunes && mismoImporte > mejor.mismoImporte) ||
      (comunes === mejor.comunes && mismoImporte === mejor.mismoImporte && g.date.getTime() > mejor.g.date.getTime())
    ) {
      mejor = { g, comunes, mismoImporte }
    }
  }
  return mejor?.g ?? null
}

/**
 * La categoria para un gasto sin ningun parecido: la de «otros» de la empresa
 * si la hay. Mejor que inventar una que el usuario no usa.
 */
export function categoriaDeRespaldo(categorias: readonly { id: string; name: string; companyId: string | null }[]): string | null {
  const otros = categorias.filter((c) => {
    const p = palabrasClave(c.name)
    return p.has('otros') || p.has('otro') || p.has('general') || p.has('varios')
  })
  const propia = otros.find((c) => c.companyId !== null) ?? otros[0]
  return propia?.id ?? null
}
