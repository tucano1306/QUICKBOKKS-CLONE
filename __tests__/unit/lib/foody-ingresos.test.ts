import { diaEnMiami, elegirCategoriaDeIngreso, type IngresoAnterior } from '@/lib/foody-integration/ingresos'
import { loteFoodySchema, tipoDeRef } from '@/lib/foody-integration/lote'

/**
 * Cifras inventadas, con la forma de lo que el usuario teclea a mano: cobros
 * de un trabajo en «Servicios», alguno de una app en su propia categoria.
 */
let n = 0
function ingreso(extra: Partial<IngresoAnterior>): IngresoAnterior {
  n += 1
  return {
    id: `i${n}`,
    amount: 500,
    date: new Date('2026-09-14T00:00:00.000Z'),
    category: 'Servicios',
    description: 'Pago como driver',
    notes: null,
    ...extra,
  }
}

describe('elegirCategoriaDeIngreso', () => {
  it('un nombre que ya salio en un ingreso cae en su categoria, aunque otra se use mas', () => {
    const anteriores = [
      ingreso({ category: 'Uber', description: 'Uber semana 1' }),
      ingreso({ category: 'Uber', description: 'Uber semana 2' }),
      ingreso({ category: 'Uber', description: 'Uber semana 3' }),
      ingreso({ category: 'Servicios', description: 'Bravatec ' }),
    ]
    expect(elegirCategoriaDeIngreso(anteriores, 'Bravatec', 1210)).toBe('Servicios')
  })

  it('las notas tambien cuentan: «bravatech» se parece a uno que lo dice en las notas', () => {
    const anteriores = [
      ingreso({ category: 'Otros Ingresos', description: 'Zelle' }),
      ingreso({ category: 'Otros Ingresos', description: 'Venta' }),
      ingreso({ category: 'Servicios', description: 'Bravatec ', notes: 'Driver en Bravatech' }),
    ]
    expect(elegirCategoriaDeIngreso(anteriores, 'bravatech', 640)).toBe('Servicios')
  })

  it('a igualdad de palabras, el del mismo importe, aunque haya otro mas reciente', () => {
    const mismoImporte = ingreso({ category: 'Servicios', description: 'Bravatec', amount: 800, date: new Date('2026-08-01T00:00:00.000Z') })
    const masReciente = ingreso({ category: 'Bonos', description: 'Bravatec', amount: 150, date: new Date('2026-10-01T00:00:00.000Z') })
    // En los dos ordenes: lo decide la regla, no por donde empiece la lista.
    expect(elegirCategoriaDeIngreso([mismoImporte, masReciente], 'Bravatec', 800)).toBe('Servicios')
    expect(elegirCategoriaDeIngreso([masReciente, mismoImporte], 'Bravatec', 800)).toBe('Servicios')
  })

  it('mas palabras en comun pesan mas que el mismo importe', () => {
    const anteriores = [
      ingreso({ category: 'Servicios', description: 'Bravatec obra norte', amount: 300 }),
      ingreso({ category: 'Bonos', description: 'Bravatec', amount: 800 }),
    ]
    expect(elegirCategoriaDeIngreso(anteriores, 'Bravatec obra', 800)).toBe('Servicios')
  })

  it('sin ninguno parecido, la categoria que mas usa para ingresos', () => {
    const anteriores = [
      ingreso({ category: 'Servicios' }),
      ingreso({ category: 'Servicios' }),
      ingreso({ category: 'Otros Ingresos', description: 'Venta de la bici' }),
    ]
    // Mal escrito en Foody: no se parece a nada, y no estrena categoria.
    expect(elegirCategoriaDeIngreso(anteriores, 'Bravtec', 1312.4)).toBe('Servicios')
  })

  it('a igualdad de usos, la usada mas recientemente', () => {
    const anteriores = [
      ingreso({ category: 'Uber', date: new Date('2026-03-01T00:00:00.000Z') }),
      ingreso({ category: 'Servicios', date: new Date('2026-09-01T00:00:00.000Z') }),
    ]
    expect(elegirCategoriaDeIngreso(anteriores, 'Cliente nuevo', 100)).toBe('Servicios')
  })

  it('la misma categoria escrita distinto cuenta como una', () => {
    const anteriores = [
      ingreso({ category: 'servicios ' }),
      ingreso({ category: 'Servicios', date: new Date('2026-10-01T00:00:00.000Z') }),
      ingreso({ category: 'Uber' }),
      ingreso({ category: 'Uber' }),
    ]
    // Dos «Servicios» frente a dos «Uber»: gana la usada hace menos, con la
    // forma de su uso mas reciente.
    expect(elegirCategoriaDeIngreso(anteriores, 'Cliente nuevo', 100)).toBe('Servicios')
  })

  it('si el usuario recategoriza aqui lo que llego de Foody, el siguiente llega con lo nuevo', () => {
    const anteriores = [
      ingreso({ category: 'Servicios', description: 'Bravatec', date: new Date('2026-10-31T00:00:00.000Z') }),
      ingreso({
        category: 'Driver Bravatec',
        description: 'Bravatec',
        notes: 'Desde Foody · Ingresos',
        date: new Date('2026-11-06T00:00:00.000Z'),
      }),
    ]
    expect(elegirCategoriaDeIngreso(anteriores, 'Bravatec', 1730)).toBe('Driver Bravatec')
  })

  it('las notas que pone Foody no hacen parecidos a todos los ingresos', () => {
    const anteriores = [
      ingreso({ category: 'Servicios' }),
      ingreso({ category: 'Servicios' }),
      ingreso({ category: 'Driver Bravatec', description: 'Bravatec', notes: 'Desde Foody · Ingresos' }),
    ]
    // «Ingresos extra» comparte «ingresos» con la nota de Foody: no basta.
    expect(elegirCategoriaDeIngreso(anteriores, 'Ingresos extra', 50)).toBe('Servicios')
  })

  it('sin ningun ingreso previo, null: decide quien llama', () => {
    expect(elegirCategoriaDeIngreso([], 'Bravatec', 100)).toBeNull()
    expect(elegirCategoriaDeIngreso([ingreso({ category: '  ' })], 'Bravatec', 100)).toBeNull()
  })
})

describe('diaEnMiami', () => {
  it('el dia en Miami, no en UTC', () => {
    // Por la tarde en Miami: el mismo dia.
    expect(diaEnMiami(new Date('2026-10-25T21:43:52.466Z'))).toBe('2026-10-25')
    // Por la noche en Miami ya es el dia siguiente en UTC (horario de verano, UTC-4).
    expect(diaEnMiami(new Date('2026-10-26T02:30:00.000Z'))).toBe('2026-10-25')
    // En noviembre ya sin horario de verano (UTC-5).
    expect(diaEnMiami(new Date('2026-11-19T04:30:00.000Z'))).toBe('2026-11-18')
  })
})

describe('refs de ingresos', () => {
  it('una ref income: es un ingreso; lo demas, gastos', () => {
    expect(tipoDeRef('income:1e3b34b6-bacc-46da-a674-42e63c0bf882')).toBe('ingreso')
    expect(tipoDeRef('trip:t1:grocery')).toBe('gasto')
    expect(tipoDeRef('payment:p1:negocio')).toBe('gasto')
  })

  it('el lote acepta ingresos, y no otros prefijos', () => {
    const ingresoFoody = {
      ref: 'income:1e3b34b6-bacc-46da-a674-42e63c0bf882',
      fecha: '2026-11-06',
      monto: 1210,
      categoria: 'Otros Ingresos',
      descripcion: 'Bravatec',
      notas: 'Desde Foody · Ingresos',
    }
    expect(loteFoodySchema.safeParse({ upserts: [ingresoFoody] }).success).toBe(true)
    expect(loteFoodySchema.safeParse({ upserts: [{ ...ingresoFoody, ref: 'ingreso:abc' }] }).success).toBe(false)
  })
})
