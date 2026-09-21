/**
 * Reclasificacion masiva - camino 'execute'.
 *
 * El bug: la pantalla mandaba { action, companyId, transactionIds,
 * newCategoryId } pero la ruta desestructuraba { transactions,
 * destinationAccount }. `transactions` quedaba undefined, `for (const t of
 * transactions)` lanzaba TypeError, el try/catch lo volvia un 500 y la pantalla
 * -- que solo miraba response.ok, sin rama else -- no reclasificaba nada ni
 * decia por que.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    expenseCategory: { findUnique: jest.fn(), findMany: jest.fn() },
    bankTransaction: { findMany: jest.fn(), update: jest.fn() },
    expense: { findMany: jest.fn(), update: jest.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  executeReclassification,
  resolveCategory,
  resolveTargets,
} from '@/lib/mass-reclassification'

const db = prisma as unknown as {
  expenseCategory: { findUnique: jest.Mock; findMany: jest.Mock }
  bankTransaction: { findMany: jest.Mock; update: jest.Mock }
  expense: { findMany: jest.Mock; update: jest.Mock }
}

const CATEGORIA = { id: 'cat-1', name: 'Compras internet', companyId: 'emp-1' }

beforeEach(() => {
  jest.clearAllMocks()
})

describe('resolveCategory', () => {
  it('resuelve por id, que es lo que manda la pantalla', async () => {
    db.expenseCategory.findUnique.mockResolvedValue(CATEGORIA)

    const cat = await resolveCategory('emp-1', 'cat-1', undefined)

    expect(cat).toEqual(CATEGORIA)
    expect(db.expenseCategory.findUnique).toHaveBeenCalledWith({ where: { id: 'cat-1' } })
  })

  it('acepta tambien un nombre, ignorando mayusculas y acentos', async () => {
    db.expenseCategory.findMany.mockResolvedValue([CATEGORIA])

    const cat = await resolveCategory('emp-1', undefined, 'COMPRAS INTERNET')

    expect(cat).toEqual(CATEGORIA)
  })

  it('devuelve null si no llega ni id ni nombre', async () => {
    expect(await resolveCategory('emp-1', undefined, undefined)).toBeNull()
  })
})

describe('resolveTargets', () => {
  it('localiza cada id en su tabla sin fiarse del cliente', async () => {
    db.bankTransaction.findMany.mockResolvedValue([
      { id: 'bank-1', description: 'Pago ISP', name: 'ISP', amount: -50, category: ['Otros'] },
    ])
    db.expense.findMany.mockResolvedValue([
      { id: 'exp-1', description: 'Router', amount: 80, category: { name: 'Equipos' } },
    ])

    const targets = await resolveTargets(['bank-1', 'exp-1'], 'emp-1')

    expect(targets).toHaveLength(2)
    expect(targets.find((t) => t.id === 'bank-1')?.source).toBe('bank')
    expect(targets.find((t) => t.id === 'exp-1')?.source).toBe('expense')
  })

  it('filtra por empresa: no reclasifica lo de otra compania', async () => {
    db.bankTransaction.findMany.mockResolvedValue([])
    db.expense.findMany.mockResolvedValue([])

    await resolveTargets(['exp-1'], 'emp-1')

    expect(db.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId: 'emp-1' }) })
    )
  })

  it('descarta ids que ya no existen en vez de reventar', async () => {
    db.bankTransaction.findMany.mockResolvedValue([])
    db.expense.findMany.mockResolvedValue([])

    expect(await resolveTargets(['fantasma'], 'emp-1')).toEqual([])
  })
})

describe('executeReclassification', () => {
  it('reclasifica gastos por categoryId y bancarias por nombre', async () => {
    // BankTransaction.category es String[], asi que ahi va el NOMBRE;
    // Expense se repunta con el id.
    const targets = [
      { id: 'bank-1', source: 'bank' as const, description: 'Pago ISP', amount: 50, currentCategory: 'Otros' },
      { id: 'exp-1', source: 'expense' as const, description: 'Router', amount: 80, currentCategory: 'Equipos' },
    ]

    const res = await executeReclassification(targets, CATEGORIA)

    expect(res).toEqual({ success: 2, failed: 0 })
    expect(db.bankTransaction.update).toHaveBeenCalledWith({
      where: { id: 'bank-1' },
      data: { category: ['Compras internet'] },
    })
    expect(db.expense.update).toHaveBeenCalledWith({
      where: { id: 'exp-1' },
      data: { categoryId: 'cat-1' },
    })
  })

  it('una fila que falla no aborta el lote', async () => {
    db.expense.update
      .mockRejectedValueOnce(new Error('fila bloqueada'))
      .mockResolvedValueOnce({})

    const targets = [
      { id: 'exp-1', source: 'expense' as const, description: 'A', amount: 1, currentCategory: 'X' },
      { id: 'exp-2', source: 'expense' as const, description: 'B', amount: 2, currentCategory: 'X' },
    ]

    expect(await executeReclassification(targets, CATEGORIA)).toEqual({ success: 1, failed: 1 })
  })

  it('con la lista vacia no escribe nada', async () => {
    expect(await executeReclassification([], CATEGORIA)).toEqual({ success: 0, failed: 0 })
    expect(db.expense.update).not.toHaveBeenCalled()
    expect(db.bankTransaction.update).not.toHaveBeenCalled()
  })
})
