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

/**
 * Los cheques y pagos sueltos que el usuario apunta en Foody como ingresos.
 * Cifras inventadas.
 */
describe('aplicarLoteFoody — ingresos', () => {
  const cobro = (extra: Record<string, unknown> = {}) => ({
    ref: 'income:c1',
    fecha: '2026-11-06',
    monto: 1210,
    categoria: 'Otros Ingresos',
    descripcion: 'Bravatec',
    notas: 'Desde Foody · Ingresos',
    ...extra,
  })

  const tecleado = (extra: Partial<Fila>): Fila => ({
    id: 'manual',
    companyId: EMPRESA,
    type: 'INCOME',
    category: 'Servicios',
    amount: 1210,
    date: new Date('2026-11-06T00:00:00.000Z'),
    description: 'Bravatec ',
    notes: null,
    reference: null,
    ...extra,
  })

  it('un ingreso nuevo se crea como INCOME, en la categoria de los ingresos parecidos', async () => {
    filas.push(tecleado({ id: 'viejo', amount: 3000, date: new Date('2026-09-17T00:00:00.000Z') }))
    const r = await aplicarLoteFoody(EMPRESA, { upserts: [cobro()], borrar: [], simular: false })
    expect(r.resultados).toEqual([{ ref: 'income:c1', accion: 'creado', id: 't1', categoria: 'Servicios' }])
    expect(filas[1]).toMatchObject({
      companyId: EMPRESA,
      type: 'INCOME',
      status: 'COMPLETED',
      category: 'Servicios',
      amount: 1210,
      description: 'Bravatec',
      notes: 'Desde Foody · Ingresos',
      reference: 'foody:income:c1',
    })
    expect(filas[1].date.toISOString()).toBe('2026-11-06T00:00:00.000Z')
  })

  it('para clasificar un ingreso solo cuentan los ingresos: un gasto con el mismo nombre no', async () => {
    filas.push(tecleado({ id: 'cobro-viejo', amount: 2500, date: new Date('2026-09-17T00:00:00.000Z') }))
    // Mas reciente y con las mismas palabras, pero es un gasto.
    filas.push(
      tecleado({ id: 'gasto', type: 'EXPENSE', category: 'Gasolina', amount: 45, date: new Date('2026-11-01T00:00:00.000Z') })
    )
    const r = await aplicarLoteFoody(EMPRESA, { upserts: [cobro()], borrar: [], simular: false })
    expect(r.resultados[0]).toMatchObject({ accion: 'creado', categoria: 'Servicios' })
  })

  it('sin ningun ingreso en la empresa, la categoria que manda Foody', async () => {
    await aplicarLoteFoody(EMPRESA, { upserts: [cobro()], borrar: [], simular: false })
    expect(filas[0]).toMatchObject({ type: 'INCOME', category: 'Otros Ingresos' })
  })

  it('el mismo cobro ya tecleado a mano se enlaza, sin crear otro y sin tocar lo escrito', async () => {
    filas.push(tecleado({ date: new Date('2026-11-07T00:00:00.000Z') }))
    const r = await aplicarLoteFoody(EMPRESA, { upserts: [cobro()], borrar: [], simular: false })
    expect(r.resultados[0]).toEqual({ ref: 'income:c1', accion: 'vinculado', id: 'manual' })
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ description: 'Bravatec ', category: 'Servicios', reference: 'foody:income:c1' })
  })

  it('un GASTO del mismo importe y dia nunca se enlaza con un ingreso, ni al reves', async () => {
    filas.push(tecleado({ id: 'gasto-manual', type: 'EXPENSE', category: 'Otros gastos' }))
    const r = await aplicarLoteFoody(EMPRESA, { upserts: [cobro()], borrar: [], simular: false })
    expect(r.resultados[0].accion).toBe('creado')
    expect(filas.find((f) => f.id === 'gasto-manual')?.reference).toBeNull()

    filas.length = 0
    filas.push(tecleado({ id: 'ingreso-manual', amount: 20.68, date: new Date('2026-10-06T00:00:00.000Z') }))
    const g = await aplicarLoteFoody(EMPRESA, { upserts: [gasto()], borrar: [], simular: false })
    expect(g.resultados[0].accion).toBe('creado')
    expect(filas.find((f) => f.id === 'ingreso-manual')?.reference).toBeNull()
  })

  it('si Foody corrige el importe, se corrige aqui; la categoria se queda', async () => {
    await aplicarLoteFoody(EMPRESA, { upserts: [cobro()], borrar: [], simular: false })
    filas[0].category = 'Driver'
    const r = await aplicarLoteFoody(EMPRESA, { upserts: [cobro({ monto: 1150.5 })], borrar: [], simular: false })
    expect(r.resultados[0].accion).toBe('actualizado')
    expect(filas[0]).toMatchObject({ type: 'INCOME', amount: 1150.5, category: 'Driver' })
  })

  it('borrar quita el ingreso que creo Foody; desvincular deja el que tecleo el usuario', async () => {
    filas.push(tecleado({ amount: 640, date: new Date('2026-10-24T00:00:00.000Z') }))
    await aplicarLoteFoody(EMPRESA, {
      upserts: [cobro(), cobro({ ref: 'income:c2', monto: 640, fecha: '2026-10-24' })],
      borrar: [],
      simular: false,
    })
    expect(filas).toHaveLength(2)
    const r = await aplicarLoteFoody(EMPRESA, {
      upserts: [],
      borrar: [
        { ref: 'income:c1', modo: 'borrar', destino: 'personal' },
        { ref: 'income:c2', modo: 'desvincular', destino: 'personal' },
      ],
      simular: false,
    })
    expect(r.resultados.map((x) => x.accion)).toEqual(['borrado', 'desvinculado'])
    expect(filas).toEqual([expect.objectContaining({ id: 'manual', reference: null })])
  })

  it('simular un ingreso dice con que categoria entraria, sin escribir nada', async () => {
    filas.push(tecleado({ id: 'viejo', amount: 3000, date: new Date('2026-09-17T00:00:00.000Z') }))
    const r = await aplicarLoteFoody(EMPRESA, { upserts: [cobro()], borrar: [], simular: true })
    expect(r.resultados).toEqual([{ ref: 'income:c1', accion: 'creado', categoria: 'Servicios' }])
    expect(filas).toHaveLength(1)
    expect(fake.$transaction).not.toHaveBeenCalled()
  })

  it('un ingreso de negocio no se apunta en ningun sitio', async () => {
    const r = await aplicarLoteFoody(
      EMPRESA,
      {
        upserts: [cobro({ ref: 'income:c1:negocio', destino: 'negocio' })],
        borrar: [{ ref: 'income:c9:negocio', modo: 'borrar', destino: 'negocio' }],
        simular: false,
      },
      'venecoro'
    )
    expect(r.resultados.map((x) => x.accion)).toEqual(['omitido', 'omitido'])
    expect(r.resultados[0].motivo).toMatch(/ingresos de negocio/)
    expect(filas).toHaveLength(0)
  })
})
