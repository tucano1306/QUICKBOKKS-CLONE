/**
 * @jest-environment node
 */

/**
 * Lo de NEGOCIO de Foody en el modulo de Gastos de la empresa de negocio, contra
 * unas tablas en memoria que entienden justo las consultas que se hacen.
 *
 * Los datos imitan lo que el usuario teclea cada mes en Venecoro: la cuota de
 * la Suburban (GMC, «Vehiculo»), el seguro (Cable Insurance, «Seguro Geico»).
 */

type Gasto = {
  id: string
  userId: string
  companyId: string
  categoryId: string
  amount: number
  date: Date
  description: string
  vendor: string | null
  paymentMethod: string
  reference: string | null
  taxDeductible: boolean
  taxAmount: number
  notes: string | null
  attachments: string[]
  status: string
  updatedAt?: Date
}

let gastos: Gasto[] = []
let transacciones: any[] = []
let asientos: any[] = []
let cuentas: { id: string; code: string; companyId: string | null }[] = []
let siguiente = 1

const CATEGORIAS = [
  { id: 'cat-vehiculo', name: 'Vehiculo', companyId: 'venecoro' },
  { id: 'cat-seguro', name: 'Seguro Geico', companyId: 'venecoro' },
  { id: 'cat-otros', name: 'Otros', companyId: 'venecoro' },
  { id: 'cat-super', name: 'Supermercado', companyId: 'leonardo' },
]
let usuariosEmpresa: { companyId: string; userId: string; isOwner: boolean; createdAt: Date }[] = []

function conCategoria(g: Gasto) {
  return { ...g, category: { name: CATEGORIAS.find((c) => c.id === g.categoryId)?.name ?? '' } }
}

function cumple(g: Gasto, where: any): boolean {
  if (where.companyId && g.companyId !== where.companyId) return false
  if (typeof where.reference === 'string' && g.reference !== where.reference) return false
  if (where.OR && !where.OR.some((o: any) => g.reference === o.reference)) return false
  if (where.amount && (g.amount < where.amount.gte || g.amount > where.amount.lte)) return false
  if (where.date && (g.date < where.date.gte || g.date >= where.date.lt)) return false
  return true
}

const fake: any = {
  expense: {
    findFirst: jest.fn(async ({ where }: any) => {
      const g = gastos.find((x) => cumple(x, where))
      return g ? conCategoria(g) : null
    }),
    findMany: jest.fn(async ({ where, orderBy, take }: any) => {
      let filas = gastos.filter((x) => cumple(x, where)).map(conCategoria)
      if (orderBy?.date === 'desc') filas = filas.sort((a, b) => b.date.getTime() - a.date.getTime())
      return filas.slice(0, take ?? filas.length)
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const g = gastos.find((x) => x.id === where.id)!
      Object.assign(g, data)
      return g
    }),
    create: jest.fn(async ({ data }: any) => {
      const g = { id: `e${siguiente++}`, ...data }
      gastos.push(g)
      return g
    }),
    delete: jest.fn(async ({ where }: any) => {
      gastos = gastos.filter((x) => x.id !== where.id)
    }),
  },
  expenseCategory: {
    findMany: jest.fn(async ({ where }: any) =>
      CATEGORIAS.filter((c) => where.OR.some((o: any) => o.companyId === c.companyId))
    ),
    findUnique: jest.fn(async ({ where }: any) => CATEGORIAS.find((c) => c.id === where.id) ?? null),
  },
  companyUser: {
    findFirst: jest.fn(async ({ where }: any) => {
      const suyos = usuariosEmpresa
        .filter((u) => u.companyId === where.companyId)
        .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.createdAt.getTime() - b.createdAt.getTime())
      return suyos[0] ?? null
    }),
  },
  chartOfAccounts: {
    findFirst: jest.fn(async ({ where }: any) => cuentas.find((c) => c.code === where.code) ?? null),
  },
  journalEntry: {
    findFirst: jest.fn(async ({ where }: any) => {
      if (where.reference) return asientos.find((a) => a.reference === where.reference) ?? null
      return null
    }),
    findUnique: jest.fn(async ({ where }: any) => asientos.find((a) => a.id === where.id) ?? null),
    count: jest.fn(async () => asientos.length),
    create: jest.fn(async ({ data }: any) => {
      const a = { id: `je${asientos.length + 1}`, ...data, lines: data.lines.create.map((l: any, i: number) => ({ id: `l${i}`, ...l })) }
      asientos.push(a)
      return a
    }),
    update: jest.fn(async ({ where, data }: any) => Object.assign(asientos.find((a) => a.id === where.id), data)),
  },
  journalEntryLine: {
    update: jest.fn(async ({ where, data }: any) => {
      for (const a of asientos) for (const l of a.lines) if (l.id === where.id) Object.assign(l, data)
    }),
  },
  transaction: {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async ({ data }: any) => {
      const t = { id: `t${siguiente++}`, ...data }
      transacciones.push(t)
      return t
    }),
    update: jest.fn(),
    delete: jest.fn(),
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

function manual(extra: Partial<Gasto>): Gasto {
  return {
    id: `m${siguiente++}`,
    userId: 'leo',
    companyId: 'venecoro',
    categoryId: 'cat-otros',
    amount: 100,
    date: new Date('2026-09-14T12:00:00.000Z'),
    description: 'Gasto',
    vendor: null,
    paymentMethod: 'TRANSFER',
    reference: '',
    taxDeductible: true,
    taxAmount: 0,
    notes: null,
    attachments: [],
    status: 'PAID',
    ...extra,
  }
}

const gmc = (extra: Record<string, unknown> = {}) => ({
  ref: 'payment:r-gmc:negocio',
  fecha: '2026-10-14',
  monto: 1097,
  categoria: 'Otros gastos',
  descripcion: 'GMC',
  notas: 'Desde Foody · Pagos · octubre 2026',
  destino: 'negocio' as const,
  ...extra,
})

const lote = (upserts: any[], borrar: any[] = [], simular = false) => ({ upserts, borrar, simular })

beforeEach(() => {
  siguiente = 1
  transacciones = []
  asientos = []
  cuentas = []
  usuariosEmpresa = [{ companyId: 'venecoro', userId: 'leo', isOwner: true, createdAt: new Date('2025-01-01') }]
  // Septiembre, tecleado a mano como cada mes.
  gastos = [
    manual({ amount: 1097, categoryId: 'cat-vehiculo', description: 'Pago de la suburban', vendor: 'GMC' }),
    manual({ amount: 917, categoryId: 'cat-seguro', description: 'Pago de seguro', vendor: 'Cable Insurance' }),
  ]
  jest.clearAllMocks()
})

describe('aplicarLoteFoody — negocio', () => {
  it('la cuota de GMC entra en Gastos de Venecoro tal como la apunta el usuario', async () => {
    const r = await aplicarLoteFoody('leonardo', lote([gmc()]), 'venecoro')
    expect(r.resultados).toEqual([{ ref: 'payment:r-gmc:negocio', accion: 'creado', id: 'e3', categoria: 'Vehiculo' }])
    expect(gastos.find((g) => g.id === 'e3')).toMatchObject({
      companyId: 'venecoro',
      categoryId: 'cat-vehiculo',
      description: 'Pago de la suburban',
      vendor: 'GMC',
      paymentMethod: 'TRANSFER',
      userId: 'leo',
      amount: 1097,
      status: 'PAID',
      reference: 'foody:payment:r-gmc:negocio',
      notes: 'Desde Foody · Pagos · octubre 2026',
    })
    expect(gastos.find((g) => g.id === 'e3')!.date.toISOString()).toBe('2026-10-14T12:00:00.000Z')
    // Y nada en las cuentas de casa.
    expect(transacciones).toHaveLength(0)
  })

  it('si ya lo tecleaste este mes, se enlaza en vez de duplicarlo', async () => {
    gastos.push(manual({ id: 'oct', amount: 1097, date: new Date('2026-10-14T12:00:00.000Z'), description: 'Suburban', vendor: 'GMC' }))
    const r = await aplicarLoteFoody('leonardo', lote([gmc()]), 'venecoro')
    expect(r.resultados[0]).toEqual({ ref: 'payment:r-gmc:negocio', accion: 'vinculado', id: 'oct' })
    expect(gastos).toHaveLength(3)
    expect(gastos.find((g) => g.id === 'oct')).toMatchObject({ description: 'Suburban', reference: 'foody:payment:r-gmc:negocio' })
  })

  it('sin empresa de negocio se omite, y no se escribe en ningun sitio', async () => {
    const r = await aplicarLoteFoody('leonardo', lote([gmc()], [{ ref: 'payment:viejo:negocio', modo: 'borrar', destino: 'negocio' }]), null)
    expect(r.resultados.map((x) => x.accion)).toEqual(['omitido', 'omitido'])
    expect(r.resultados[0].motivo).toMatch(/FOODY_BUSINESS_COMPANY_ID/)
    expect(gastos).toHaveLength(2)
    expect(transacciones).toHaveLength(0)
  })

  it('lo personal sigue entrando en las transacciones de la empresa personal', async () => {
    const personal = { ref: 'trip:t1:grocery', fecha: '2026-10-14', monto: 20.68, categoria: 'Supermercado', descripcion: 'Publix', destino: 'personal' as const }
    const r = await aplicarLoteFoody('leonardo', lote([personal, gmc()]), 'venecoro')
    expect(r.resultados.map((x) => x.accion)).toEqual(['creado', 'creado'])
    expect(transacciones).toEqual([expect.objectContaining({ companyId: 'leonardo', amount: 20.68, reference: 'foody:trip:t1:grocery' })])
    expect(gastos.filter((g) => g.reference?.startsWith('foody:'))).toHaveLength(1)
  })

  it('si cambia el importe en Foody se actualiza, sin tocar lo que el usuario decidio aqui', async () => {
    await aplicarLoteFoody('leonardo', lote([gmc()]), 'venecoro')
    const creado = gastos.find((g) => g.reference === 'foody:payment:r-gmc:negocio')!
    creado.categoryId = 'cat-otros'
    creado.description = 'Cuota Suburban'
    const r = await aplicarLoteFoody('leonardo', lote([gmc({ monto: 1100 })]), 'venecoro')
    expect(r.resultados[0].accion).toBe('actualizado')
    expect(creado).toMatchObject({ amount: 1100, categoryId: 'cat-otros', description: 'Cuota Suburban' })
  })

  it('mandarlo dos veces no crea dos', async () => {
    await aplicarLoteFoody('leonardo', lote([gmc()]), 'venecoro')
    const r = await aplicarLoteFoody('leonardo', lote([gmc()]), 'venecoro')
    expect(r.resultados[0].accion).toBe('sin_cambios')
    expect(gastos).toHaveLength(3)
  })

  it('sin nada parecido: categoria «Otros», proveedor el nombre de Foody, metodo OTHER, firmado por el dueño', async () => {
    usuariosEmpresa.push({ companyId: 'venecoro', userId: 'ana', isOwner: false, createdAt: new Date('2024-01-01') })
    const r = await aplicarLoteFoody(
      'leonardo',
      lote([gmc({ ref: 'trip:t9:home:negocio', descripcion: 'Home Depot', monto: 64.2 })]),
      'venecoro'
    )
    expect(r.resultados[0]).toMatchObject({ accion: 'creado', categoria: 'Otros' })
    expect(gastos.at(-1)).toMatchObject({
      categoryId: 'cat-otros',
      description: 'Home Depot',
      vendor: 'Home Depot',
      paymentMethod: 'OTHER',
      userId: 'leo',
    })
  })

  it('borrar quita lo que creo Foody; desvincular deja lo que tecleo el usuario', async () => {
    gastos.push(manual({ id: 'oct', amount: 917, date: new Date('2026-10-14T12:00:00.000Z'), vendor: 'Cable Insurance' }))
    await aplicarLoteFoody(
      'leonardo',
      lote([gmc(), gmc({ ref: 'payment:r-cable:negocio', monto: 917, descripcion: 'Cable insurance' })]),
      'venecoro'
    )
    const r = await aplicarLoteFoody(
      'leonardo',
      lote([], [
        { ref: 'payment:r-gmc:negocio', modo: 'borrar', destino: 'negocio' },
        { ref: 'payment:r-cable:negocio', modo: 'desvincular', destino: 'negocio' },
      ]),
      'venecoro'
    )
    expect(r.resultados.map((x) => x.accion)).toEqual(['borrado', 'desvinculado'])
    expect(gastos.some((g) => g.reference === 'foody:payment:r-gmc:negocio')).toBe(false)
    expect(gastos.find((g) => g.id === 'oct')).toMatchObject({ reference: null, vendor: 'Cable Insurance' })
  })

  it('simular dice con que categoria entraria, sin escribir nada', async () => {
    const r = await aplicarLoteFoody('leonardo', lote([gmc()], [], true), 'venecoro')
    expect(r.resultados[0]).toEqual({ ref: 'payment:r-gmc:negocio', accion: 'creado', categoria: 'Vehiculo' })
    expect(gastos).toHaveLength(2)
    expect(fake.$transaction).not.toHaveBeenCalled()
  })

  it('con plan de cuentas, lleva su asiento como desde el formulario, y lo sigue al corregir y al borrar', async () => {
    cuentas = [
      { id: 'caja', code: '1000', companyId: null },
      { id: 'otros-gastos', code: '5900', companyId: null },
    ]
    await aplicarLoteFoody('leonardo', lote([gmc()]), 'venecoro')
    const creado = gastos.find((g) => g.reference === 'foody:payment:r-gmc:negocio')!
    expect(asientos).toHaveLength(1)
    expect(asientos[0]).toMatchObject({ reference: creado.id, companyId: 'venecoro', status: 'POSTED' })
    expect(asientos[0].lines.map((l: any) => [l.accountId, l.debit, l.credit])).toEqual([
      ['otros-gastos', 1097, 0],
      ['caja', 0, 1097],
    ])

    await aplicarLoteFoody('leonardo', lote([gmc({ monto: 1100 })]), 'venecoro')
    expect(asientos[0].lines.map((l: any) => [l.debit, l.credit])).toEqual([
      [1100, 0],
      [0, 1100],
    ])

    await aplicarLoteFoody('leonardo', lote([], [{ ref: 'payment:r-gmc:negocio', modo: 'borrar', destino: 'negocio' }]), 'venecoro')
    expect(asientos).toHaveLength(2)
    expect(asientos[1].reference).toBe(`REV-${asientos[0].entryNumber}`)
    expect(asientos[1].lines.map((l: any) => [l.debit, l.credit])).toEqual([
      [0, 1100],
      [1100, 0],
    ])
  })
})
