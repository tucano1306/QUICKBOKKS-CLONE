import { elegirDuplicado, type CandidatoManual } from '@/lib/foody-integration/duplicados'
import type { GastoFoody } from '@/lib/foody-integration/lote'

/**
 * Hasta ahora cada ticket se tecleaba en Foody y otra vez aqui. Al encender la
 * integracion, un gasto que ya estaba escrito a mano no debe aparecer dos
 * veces: se enlaza.
 */
const publix: GastoFoody = {
  ref: 'trip:t1:grocery',
  fecha: '2026-09-06',
  monto: 20.68,
  categoria: 'Supermercado',
  descripcion: 'Publix',
}

const manual = (id: string, extra: Partial<CandidatoManual> = {}): CandidatoManual => ({
  id,
  amount: 20.68,
  date: new Date('2026-09-06T00:00:00.000Z'),
  category: 'Supermercado',
  description: 'Publix',
  ...extra,
})

describe('elegirDuplicado', () => {
  it('el mismo gasto tecleado a mano se enlaza', () => {
    expect(elegirDuplicado([manual('m1')], publix)?.id).toBe('m1')
  })

  it('un dia de diferencia todavia es el mismo gasto', () => {
    expect(elegirDuplicado([manual('m1', { date: new Date('2026-09-07T00:00:00.000Z') })], publix)?.id).toBe('m1')
  })

  it('dos dias ya no', () => {
    expect(elegirDuplicado([manual('m1', { date: new Date('2026-09-08T00:00:00.000Z') })], publix)).toBeNull()
  })

  it('un centavo de diferencia ya no es el mismo gasto', () => {
    expect(elegirDuplicado([manual('m1', { amount: 20.69 })], publix)).toBeNull()
  })

  it('entre dos del mismo importe gana el de la misma categoria', () => {
    const r = elegirDuplicado(
      [manual('m1', { category: 'Otros gastos', description: 'Ross' }), manual('m2', { description: 'Compra' })],
      publix
    )
    expect(r?.id).toBe('m2')
  })

  it('con la categoria escrita de otra forma sigue siendo la misma', () => {
    const r = elegirDuplicado(
      [manual('m1', { category: 'Otros gastos' }), manual('m2', { category: 'supermercado ', description: 'x' })],
      publix
    )
    expect(r?.id).toBe('m2')
  })

  it('a igualdad, gana el que comparte palabras y luego el de la fecha mas cercana', () => {
    const r = elegirDuplicado(
      [
        manual('m1', { category: 'Otros', description: 'Walmart', date: new Date('2026-09-06T00:00:00.000Z') }),
        manual('m2', { category: 'Otros', description: 'Publix Super Market', date: new Date('2026-09-07T00:00:00.000Z') }),
      ],
      publix
    )
    expect(r?.id).toBe('m2')
  })

  it('un gasto manual ya enlazado en este lote no se enlaza otra vez', () => {
    expect(elegirDuplicado([manual('m1')], publix, new Set(['m1']))).toBeNull()
  })

  it('sin candidatos, nada', () => {
    expect(elegirDuplicado([], publix)).toBeNull()
  })
})
