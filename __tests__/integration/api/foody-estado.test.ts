/**
 * @jest-environment node
 */

/**
 * GET /api/integrations/foody/estado: lo que enseña la tarjeta de Foody en
 * Integraciones. Los ingresos que llegan de Foody se cuentan aparte de los
 * gastos (un cobro no infla «lo gastado este mes») y salen marcados entre los
 * recientes.
 */

const aggregate = jest.fn()
const count = jest.fn()
const findMany = jest.fn()

jest.mock('next-auth', () => ({ getServerSession: jest.fn(async () => ({ user: { id: 'u1' } })) }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    companyUser: { findFirst: jest.fn(async () => ({ id: 'acceso' })) },
    company: { findUnique: jest.fn(async () => ({ id: 'leonardo', name: 'Leonardo ' })) },
    transaction: {
      aggregate: (...a: unknown[]) => aggregate(...a),
      count: (...a: unknown[]) => count(...a),
      findMany: (...a: unknown[]) => findMany(...a),
    },
    expense: { aggregate: jest.fn(), findMany: jest.fn() },
  },
}))

import { GET } from '@/app/api/integrations/foody/estado/route'

type Consulta = { where: { type?: unknown } }

beforeEach(() => {
  process.env.FOODY_SECRET = 'secreto-de-prueba-foody-computo-0123456789'
  process.env.FOODY_COMPANY_ID = 'leonardo'
  delete process.env.FOODY_BUSINESS_COMPANY_ID
  // Importes inventados.
  aggregate.mockReset().mockImplementation(async ({ where }: Consulta) =>
    where.type === 'INCOME'
      ? { _count: { _all: 2 }, _sum: { amount: 1500.5 } }
      : { _count: { _all: 7 }, _sum: { amount: 321.456 } }
  )
  count.mockReset().mockResolvedValue(40)
  findMany.mockReset().mockResolvedValue([
    {
      id: 'ingreso',
      type: 'INCOME',
      description: 'Obra',
      category: 'Servicios',
      amount: 900,
      date: new Date('2026-11-13T00:00:00Z'),
      updatedAt: new Date('2026-11-13T15:00:00Z'),
    },
    {
      id: 'gasto',
      type: 'EXPENSE',
      description: 'Publix',
      category: 'Supermercado',
      amount: 20.68,
      date: new Date('2026-11-12T00:00:00Z'),
      updatedAt: new Date('2026-11-12T15:00:00Z'),
    },
  ])
})

describe('GET /api/integrations/foody/estado', () => {
  it('cuenta los ingresos del mes aparte de los gastos', async () => {
    const json = await (await GET()).json()
    expect(json.delMes).toEqual({ cantidad: 7, total: 321.46 })
    expect(json.ingresosDelMes).toEqual({ cantidad: 2, total: 1500.5 })
    const tipos = aggregate.mock.calls.map(([q]: [Consulta]) => q.where.type).sort()
    expect(tipos).toEqual(['EXPENSE', 'INCOME'])
  })

  it('entre los recientes, los ingresos van marcados y los gastos no', async () => {
    const json = await (await GET()).json()
    expect(json.recientes.map((r: { id: string; ingreso?: boolean }) => [r.id, r.ingreso ?? false])).toEqual([
      ['ingreso', true],
      ['gasto', false],
    ])
    expect(json.recientes[0]).not.toHaveProperty('type')
    expect(findMany.mock.calls[0][0].where).toMatchObject({
      companyId: 'leonardo',
      type: { in: ['EXPENSE', 'INCOME'] },
      reference: { startsWith: 'foody:' },
    })
  })
})
