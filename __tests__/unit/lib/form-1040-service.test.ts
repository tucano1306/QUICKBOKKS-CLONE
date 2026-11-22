/**
 * Qué entra y qué no entra en el Schedule C del Form 1040.
 *
 * Son cifras fiscales calculadas a partir de dos tablas distintas, y la regla
 * de reparto no es obvia: lo de NEGOCIO vive en `Expense` (que tiene el campo
 * `taxDeductible`) y lo PERSONAL en `Transaction` (que no lo tiene). Antes se
 * sumaban las dos, así que la compra del supermercado de una persona natural
 * se restaba como gasto deducible del negocio.
 */

// La fábrica va dentro del jest.mock porque jest lo iza por encima de todo lo
// demás del fichero: una variable declarada fuera todavía no existe aquí.
jest.mock('@/lib/prisma', () => ({
  prisma: {
    company: { findUnique: jest.fn() },
    taxFormW2: { findMany: jest.fn() },
    invoice: { findMany: jest.fn() },
    transaction: { findMany: jest.fn() },
    expense: { findMany: jest.fn() },
    asset: { findMany: jest.fn() },
  },
}))

import { autoPopulateForm1040FromCompany } from '@/lib/form-1040-service'
import { prisma } from '@/lib/prisma'

type Mocked = Record<string, Record<string, jest.Mock>>
const prismaMock = prisma as unknown as Mocked

const AÑO = 2025
const enElAño = (mes: number, dia: number) => new Date(AÑO, mes, dia)

interface Escenario {
  transactions?: Array<{ type: string; category: string; amount: number; date?: Date }>
  expenses?: Array<{ amount: number }>
  invoices?: Array<{ subtotal: number; total: number }>
  w2?: Array<{ wages: number; federalIncomeTaxWithheld: number }>
  assets?: Array<{ purchaseDate: Date; purchasePrice: number; salvageValue: number; usefulLife: number }>
}

function montar(escenario: Escenario) {
  prismaMock.company.findUnique.mockResolvedValue({ id: 'empresa-1', name: 'Prueba' })
  prismaMock.taxFormW2.findMany.mockResolvedValue(escenario.w2 ?? [])
  prismaMock.invoice.findMany.mockResolvedValue(escenario.invoices ?? [])
  prismaMock.expense.findMany.mockResolvedValue(escenario.expenses ?? [])
  prismaMock.asset.findMany.mockResolvedValue(escenario.assets ?? [])
  prismaMock.transaction.findMany.mockResolvedValue(
    (escenario.transactions ?? []).map((t) => ({ date: enElAño(5, 15), ...t })),
  )
}

const leer = () => autoPopulateForm1040FromCompany('empresa-1', 'usuario-1', AÑO)

beforeEach(() => {
  jest.clearAllMocks()
})

describe('gastos que entran en el Schedule C', () => {
  it('deduce los gastos de negocio de la tabla Expense', async () => {
    montar({
      invoices: [{ subtotal: 10000, total: 10800 }],
      expenses: [{ amount: 1500 }, { amount: 500 }],
    })

    const r = await leer()

    expect(r.scheduleC?.expenses).toBe(2000)
    expect(r.scheduleC?.netProfit).toBe(8000)
  })

  it('NO deduce los gastos personales registrados como transacciones', async () => {
    montar({
      invoices: [{ subtotal: 10000, total: 10000 }],
      expenses: [{ amount: 1500 }],
      // Lo que Foody manda de la despensa de la persona natural.
      transactions: [
        { type: 'EXPENSE', category: 'Supermercado', amount: 600 },
        { type: 'EXPENSE', category: 'Farmacia', amount: 120 },
      ],
    })

    const r = await leer()

    expect(r.scheduleC?.expenses).toBe(1500)
    expect(r.scheduleC?.netProfit).toBe(8500)
    // Pero sí se informa aparte, para poder enseñarlo en pantalla.
    expect(r.scheduleC?.personalExpensesExcluded).toBe(720)
  })

  it('suma la depreciación anual del vehículo, que sí es deducción real', async () => {
    montar({
      invoices: [{ subtotal: 10000, total: 10000 }],
      expenses: [{ amount: 1000 }],
      assets: [{ purchaseDate: new Date(2024, 0, 1), purchasePrice: 30000, salvageValue: 5000, usefulLife: 5 }],
    })

    const r = await leer()

    expect(r.scheduleC?.vehicleDepreciation).toBe(5000)
    expect(r.scheduleC?.expenses).toBe(6000)
  })

  it('deja fuera el vehículo que ya agotó su vida útil', async () => {
    montar({
      invoices: [{ subtotal: 10000, total: 10000 }],
      assets: [{ purchaseDate: new Date(2015, 0, 1), purchasePrice: 30000, salvageValue: 0, usefulLife: 5 }],
    })

    const r = await leer()

    expect(r.scheduleC?.vehicleDepreciation).toBe(0)
  })
})

describe('categorías de ingreso en español', () => {
  it('reconoce "Intereses", que es la categoría que ofrece la propia app', async () => {
    montar({
      transactions: [
        { type: 'INCOME', category: 'Intereses', amount: 300 },
        { type: 'INCOME', category: 'Ventas', amount: 5000 },
      ],
    })

    const r = await leer()

    expect(r.income?.taxableInterest).toBe(300)
    // Y por tanto NO se cuenta otra vez como facturación del negocio.
    expect(r.scheduleC?.grossReceipts).toBe(5000)
  })

  it('reconoce también la forma inglesa y los dividendos', async () => {
    montar({
      transactions: [
        { type: 'INCOME', category: 'Interest Income', amount: 100 },
        { type: 'INCOME', category: 'Dividendos', amount: 250 },
      ],
    })

    const r = await leer()

    expect(r.income?.taxableInterest).toBe(100)
    expect(r.income?.ordinaryDividends).toBe(250)
    expect(r.scheduleC?.grossReceipts).toBe(0)
  })

  it('no inventa qué parte del dividendo es qualified: eso lo dice el 1099-DIV', async () => {
    montar({ transactions: [{ type: 'INCOME', category: 'Dividendos', amount: 1000 }] })

    const r = await leer()

    expect(r.income?.ordinaryDividends).toBe(1000)
    expect(r.income?.qualifiedDividends).toBe(0)
  })
})

describe('ingreso del negocio', () => {
  it('usa el subtotal de la factura, no el total con impuesto cobrado', async () => {
    montar({ invoices: [{ subtotal: 1000, total: 1160 }] })

    const r = await leer()

    expect(r.scheduleC?.grossReceipts).toBe(1000)
  })

  it('cae en las transacciones de ingreso cuando no hay facturas', async () => {
    montar({ transactions: [{ type: 'INCOME', category: 'Servicios', amount: 4200 }] })

    const r = await leer()

    expect(r.scheduleC?.grossReceipts).toBe(4200)
  })

  it('calcula el impuesto de autoempleo sobre el 92,35% de la ganancia', async () => {
    montar({ invoices: [{ subtotal: 10000, total: 10000 }], expenses: [{ amount: 0 }] })

    const r = await leer()

    // 10000 * 0.9235 * 0.153 / 2 = 706,4775
    expect(r.adjustments?.total).toBeCloseTo(706.4775, 4)
  })

  it('no cobra autoempleo cuando el negocio pierde dinero', async () => {
    montar({ invoices: [{ subtotal: 1000, total: 1000 }], expenses: [{ amount: 4000 }] })

    const r = await leer()

    expect(r.scheduleC?.netProfit).toBe(-3000)
    expect(r.adjustments?.total).toBe(0)
  })
})
