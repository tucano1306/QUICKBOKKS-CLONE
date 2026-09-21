import { categoryKey, cleanCategoryName, preferredCategoryName } from '@/lib/category-name'

/**
 * El bug: en el estado de resultados salian dos lineas "Compras internet
 * -$112,38" y "compras internet -$76,47" porque el reporte agrupaba los gastos
 * por el nombre crudo de la categoria.
 */
describe('categoryKey', () => {
  it('da la misma clave a variantes de mayusculas', () => {
    expect(categoryKey('Compras internet')).toBe(categoryKey('compras internet'))
    expect(categoryKey('COMPRAS INTERNET')).toBe(categoryKey('Compras Internet'))
  })

  it('ignora espacios sobrantes y repetidos', () => {
    expect(categoryKey('  Compras internet ')).toBe(categoryKey('Compras internet'))
    expect(categoryKey('Compras  internet')).toBe(categoryKey('Compras internet'))
  })

  it('ignora acentos, que en datos en espanol son la misma categoria', () => {
    expect(categoryKey('Telefonía')).toBe(categoryKey('Telefonia'))
  })

  it('NO junta categorias que de verdad son distintas', () => {
    expect(categoryKey('Compras internet')).not.toBe(categoryKey('Compras oficina'))
    expect(categoryKey('Salarios')).not.toBe(categoryKey('Salarios directivos'))
  })
})

describe('cleanCategoryName', () => {
  it('limpia para mostrar pero respeta como lo escribio el usuario', () => {
    expect(cleanCategoryName('  Compras   internet ')).toBe('Compras internet')
    expect(cleanCategoryName('compras internet')).toBe('compras internet')
  })
})

describe('preferredCategoryName', () => {
  it('prefiere la variante capitalizada', () => {
    expect(preferredCategoryName('compras internet', 'Compras internet')).toBe('Compras internet')
    expect(preferredCategoryName('Compras internet', 'compras internet')).toBe('Compras internet')
  })

  it('es estable: el orden de los argumentos no cambia el resultado', () => {
    // Importa porque Prisma no garantiza el orden de findMany; si no fuera
    // estable, el nombre mostrado cambiaria entre peticiones.
    expect(preferredCategoryName('Alquiler', 'Agua')).toBe(preferredCategoryName('Agua', 'Alquiler'))
    expect(preferredCategoryName('agua', 'alquiler')).toBe(preferredCategoryName('alquiler', 'agua'))
  })
})

/** Reproduce la agrupacion del reporte tal y como quedo en income-statement. */
describe('agrupacion del estado de resultados', () => {
  interface CategoryMap { [key: string]: { name: string; amount: number } }

  function addToCategory(map: CategoryMap, catName: string, amount: number): void {
    const key = categoryKey(catName)
    const display = cleanCategoryName(catName)
    if (!map[key]) {
      map[key] = { name: display, amount: 0 }
    } else {
      map[key].name = preferredCategoryName(map[key].name, display)
    }
    map[key].amount += amount
  }

  it('unifica las dos lineas de la pantalla en una sola, sumando los importes', () => {
    const map: CategoryMap = {}
    addToCategory(map, 'Compras internet', 112.38)
    addToCategory(map, 'compras internet', 76.47)

    const filas = Object.values(map)
    expect(filas).toHaveLength(1)
    expect(filas[0].name).toBe('Compras internet')
    expect(filas[0].amount).toBeCloseTo(188.85, 2)
  })

  it('no pierde ningun gasto al unificar', () => {
    const map: CategoryMap = {}
    const gastos: Array<[string, number]> = [
      ['Compras internet', 112.38],
      ['compras internet', 76.47],
      ['COMPRAS INTERNET', 10],
      ['Salarios', 2000],
      ['Telefonía', 30],
      ['Telefonia', 20],
    ]
    for (const [nombre, importe] of gastos) addToCategory(map, nombre, importe)

    const total = Object.values(map).reduce((s, c) => s + c.amount, 0)
    const esperado = gastos.reduce((s, [, importe]) => s + importe, 0)

    expect(total).toBeCloseTo(esperado, 2)
    expect(Object.values(map)).toHaveLength(3) // internet, salarios, telefonia
  })
})
