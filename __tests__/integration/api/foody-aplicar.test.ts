/**
 * @jest-environment node
 */

/**
 * aplicarLoteFoody contra una tabla `transactions` en memoria que entiende
 * justo las consultas que hace.
 */

type Fila = {
  id: string
  companyId: string
  type: string
  status?: string
  category: string
  amount: number
  date: Date
  description: string
  notes: string | null
  reference: string | null
}

let filas: Fila[] = []
let siguiente = 1

function cumple(f: Fila, where: any): boolean {
  if (where.companyId && f.companyId !== where.companyId) return false
  if (where.type && f.type !== where.type) return false
  if ('reference' in where) {
    if (where.reference === null && f.reference !== null) return false
    if (typeof where.reference === 'string' && f.reference !== where.reference) return false
  }
  if (where.amount && (f.amount < where.amount.gte || f.amount > where.amount.lte)) return false
  if (where.date && (f.date < where.date.gte || f.date >= where.date.lt)) return false
  return true
}

const fake = {
  transaction: {
    findFirst: jest.fn(async ({ where }: any) => filas.find((f) => cumple(f, where)) ?? null),
    findMany: jest.fn(async ({ where }: any) => filas.filter((f) => cumple(f, where))),
    update: jest.fn(async ({ where, data }: any) => {
      const f = filas.find((x) => x.id === where.id)!
      Object.assign(f, data)
      return f
    }),
    create: jest.fn(async ({ data }: any) => {
      const f = { id: `t${siguiente++}`, notes: null, reference: null, ...data }
      filas.push(f)
      return f
    }),
    delete: jest.fn(async ({ where }: any) => {
      filas = filas.filter((x) => x.id !== where.id)
    }),
  },
  $transaction: jest.fn(async (fn: any) => fn(fake)),
}

// Getter: jest sube este mock por encima de la declaracion de `fake`.
jest.mock('@/lib/prisma', () => ({
  get prisma() {
    return fake
  },
}))
jest.mock('@/lib/transaction-category', () => ({
  canonicalTransactionCategory: jest.fn(async (_c: string, nombre: string) => nombre),
}))

import { aplicarLoteFoody } from '@/lib/foody-integration/aplicar'

const EMPRESA = 'leonardo'
const gasto = (extra: Record<string, unknown> = {}) => ({
  ref: 'trip:t1:grocery',
  fecha: '2026-10-06',
  monto: 20.68,
  categoria: 'Supermercado',
  descripcion: 'Publix',
  notas: 'Desde Foody',
  ...extra,
})

beforeEach(() => {
  filas = []
  siguiente = 1
  jest.clearAllMocks()
})

describe('aplicarLoteFoody', () => {
  it('un gasto nuevo se crea como EXPENSE con la referencia de Foody', async () => {
    const r = await aplicarLoteFoody(EMPRESA, { upserts: [gasto()], borrar: [], simular: false })
    expect(r.resultados).toEqual([{ ref: 'trip:t1:grocery', accion: 'creado', id: 't1' }])
    expect(filas[0]).toMatchObject({
      companyId: EMPRESA,
      type: 'EXPENSE',
      status: 'COMPLETED',
      category: 'Supermercado',
      amount: 20.68,
      description: 'Publix',
      reference: 'foody:trip:t1:grocery',
    })
    expect(filas[0].date.toISOString()).toBe('2026-10-06T00:00:00.000Z')
  })

  it('mandarlo dos veces no crea dos gastos', async () => {
    await aplicarLoteFoody(EMPRESA, { upserts: [gasto()], borrar: [], simular: false })
    const r = await aplicarLoteFoody(EMPRESA, { upserts: [gasto()], borrar: [], simular: false })
    expect(r.resultados[0].accion).toBe('sin_cambios')
    expect(filas).toHaveLength(1)
  })

  it('si cambia el importe en Foody, se actualiza aqui', async () => {
    await aplicarLoteFoody(EMPRESA, { upserts: [gasto()], borrar: [], simular: false })
    const r = await aplicarLoteFoody(EMPRESA, { upserts: [gasto({ monto: 22.1 })], borrar: [], simular: false })
    expect(r.resultados[0].accion).toBe('actualizado')
    expect(filas[0].amount).toBe(22.1)
  })

  it('la categoria la manda Computo: una edicion en Foody no deshace la recategorizacion', async () => {
    await aplicarLoteFoody(EMPRESA, { upserts: [gasto()], borrar: [], simular: false })
    filas[0].category = 'Comida de casa'
    await aplicarLoteFoody(EMPRESA, { upserts: [gasto({ monto: 25 })], borrar: [], simular: false })
    expect(filas[0].category).toBe('Comida de casa')
    expect(filas[0].amount).toBe(25)
  })

  it('el mismo gasto ya tecleado a mano se enlaza, sin crear otro y sin tocar lo escrito', async () => {
    filas.push({
      id: 'manual',
      companyId: EMPRESA,
      type: 'EXPENSE',
      category: 'Supermercado',
      amount: 20.68,
      date: new Date('2026-10-06T00:00:00.000Z'),
      description: 'Publix (a mano)',
      notes: null,
      reference: null,
    })
    const r = await aplicarLoteFoody(EMPRESA, { upserts: [gasto()], borrar: [], simular: false })
    expect(r.resultados[0]).toEqual({ ref: 'trip:t1:grocery', accion: 'vinculado', id: 'manual' })
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ description: 'Publix (a mano)', reference: 'foody:trip:t1:grocery' })
  })

  it('un gasto de OTRA empresa nunca se enlaza', async () => {
    filas.push({
      id: 'ajeno',
      companyId: 'otra',
      type: 'EXPENSE',
      category: 'Supermercado',
      amount: 20.68,
      date: new Date('2026-10-06T00:00:00.000Z'),
      description: 'Publix',
      notes: null,
      reference: null,
    })
    const r = await aplicarLoteFoody(EMPRESA, { upserts: [gasto()], borrar: [], simular: false })
    expect(r.resultados[0].accion).toBe('creado')
  })

  it('borrar quita lo que creo Foody; desvincular deja lo que tecleo el usuario', async () => {
    await aplicarLoteFoody(EMPRESA, {
      upserts: [gasto(), gasto({ ref: 'payment:p1', monto: 93.39, descripcion: 'FPL' })],
      borrar: [],
      simular: false,
    })
    const r = await aplicarLoteFoody(EMPRESA, {
      upserts: [],
      borrar: [
        { ref: 'trip:t1:grocery', modo: 'borrar' },
        { ref: 'payment:p1', modo: 'desvincular' },
        { ref: 'trip:nada:grocery', modo: 'borrar' },
      ],
      simular: false,
    })
    expect(r.resultados.map((x) => x.accion)).toEqual(['borrado', 'desvinculado', 'no_existe'])
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ description: 'FPL', reference: null })
  })

  it('simular dice lo que pasaria sin escribir nada', async () => {
    const r = await aplicarLoteFoody(EMPRESA, { upserts: [gasto()], borrar: [], simular: true })
    expect(r.resultados[0].accion).toBe('creado')
    expect(r.porAccion).toEqual({ creado: 1 })
    expect(filas).toHaveLength(0)
    expect(fake.$transaction).not.toHaveBeenCalled()
  })

  it('un lote real va en una transaccion', async () => {
    await aplicarLoteFoody(EMPRESA, { upserts: [gasto()], borrar: [], simular: false })
    expect(fake.$transaction).toHaveBeenCalledTimes(1)
  })
})
