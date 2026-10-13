import { categoriaDeRespaldo, elegirPlantilla, palabrasClave, type GastoAnterior } from '@/lib/foody-integration/plantilla'

/**
 * Los gastos de abajo son como los que el usuario teclea cada mes en Venecoro:
 * la plantilla tiene que sacar de ahi la categoria y el proveedor de lo que
 * llega de Foody.
 */
let n = 0
function anterior(extra: Partial<GastoAnterior>): GastoAnterior {
  n += 1
  return {
    id: `g${n}`,
    amount: 100,
    date: new Date('2026-09-14T12:00:00.000Z'),
    categoryId: 'cat-otros',
    description: 'Gasto',
    vendor: null,
    paymentMethod: 'TRANSFER',
    taxDeductible: true,
    userId: 'leo',
    ...extra,
  }
}

const suburban = anterior({ amount: 1097, categoryId: 'cat-vehiculo', description: 'Pago de la suburban', vendor: 'GMC' })
const seguro = anterior({ amount: 917, categoryId: 'cat-seguro', description: 'Pago de seguro', vendor: 'Cable Insurance' })
const permiso = anterior({
  amount: 300,
  date: new Date('2026-08-18T12:00:00.000Z'),
  categoryId: 'cat-permisos',
  description: 'Permiso',
  vendor: "Larry's",
})
const historia = [suburban, seguro, permiso]

describe('palabrasClave', () => {
  it('sin acentos, sin apostrofos y sin palabras de relleno', () => {
    expect([...palabrasClave("Permiso Larry's")]).toEqual(['permiso', 'larrys'])
    expect([...palabrasClave('Pago de la Suburban')]).toEqual(['suburban'])
    expect([...palabrasClave('Teléfono')]).toEqual(['telefono'])
  })
})

describe('elegirPlantilla', () => {
  it('cada pago de negocio encuentra como lo apunta el usuario', () => {
    expect(elegirPlantilla(historia, 'GMC', 1097)).toBe(suburban)
    expect(elegirPlantilla(historia, 'Cable insurance', 917)).toBe(seguro)
    expect(elegirPlantilla(historia, "Permiso Larry's", 300)).toBe(permiso)
  })

  it('el importe solo no basta: $300 de otra cosa no es el permiso', () => {
    expect(elegirPlantilla(historia, 'Home Depot', 300)).toBeNull()
  })

  it('si la cuota cambia, se sigue reconociendo por el nombre', () => {
    expect(elegirPlantilla(historia, 'GMC', 224)).toBe(suburban)
  })

  it('entre dos parecidos gana el mas reciente: una recategorizacion se hereda', () => {
    const recategorizado = anterior({
      amount: 1097,
      date: new Date('2026-10-14T12:00:00.000Z'),
      categoryId: 'cat-prestamo',
      description: 'Pago de la suburban',
      vendor: 'GMC',
    })
    expect(elegirPlantilla([...historia, recategorizado], 'GMC', 1097)).toBe(recategorizado)
  })

  it('gana el que comparte mas palabras antes que el del mismo importe', () => {
    const otroSeguro = anterior({ amount: 917, description: 'Seguro', vendor: 'Geico Insurance' })
    expect(elegirPlantilla([otroSeguro, seguro], 'Cable insurance', 500)).toBe(seguro)
  })

  it('un nombre sin palabras utiles no elige nada', () => {
    expect(elegirPlantilla(historia, 'Pago', 1097)).toBeNull()
  })
})

describe('categoriaDeRespaldo', () => {
  it('la de «otros» de la empresa, antes que una global', () => {
    expect(
      categoriaDeRespaldo([
        { id: 'global', name: 'Otros gastos', companyId: null },
        { id: 'vehiculo', name: 'Vehiculo', companyId: 'venecoro' },
        { id: 'otros', name: 'Otros', companyId: 'venecoro' },
      ])
    ).toBe('otros')
  })

  it('sin ninguna de «otros», ninguna: no se inventa', () => {
    expect(categoriaDeRespaldo([{ id: 'vehiculo', name: 'Vehiculo', companyId: 'venecoro' }])).toBeNull()
  })
})
