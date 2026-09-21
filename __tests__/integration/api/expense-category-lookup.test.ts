/**
 * findCategoryByName: la busqueda que evita crear categorias duplicadas.
 *
 * Sustituye a tres busquedas distintas y todas rotas a su manera:
 *  - `name: 'Otros'` exacto y sin filtrar por empresa (escaneo de tickets)
 *  - `name: 'General'` exacto (importador de Excel)
 *  - `name: { contains, mode: 'insensitive' }` (importador de Excel), que
 *    emparejaba por subcadena y archivaba el gasto en la categoria equivocada
 */

jest.mock('@/lib/prisma', () => ({
  prisma: { expenseCategory: { findMany: jest.fn() } },
}))

import { prisma } from '@/lib/prisma'
import { findCategoryByName } from '@/lib/expense-category'

const db = prisma as unknown as { expenseCategory: { findMany: jest.Mock } }

const conCategorias = (...nombres: string[]) =>
  db.expenseCategory.findMany.mockResolvedValue(
    nombres.map((name, i) => ({ id: `cat-${i}`, name, companyId: 'emp-1' }))
  )

beforeEach(() => jest.clearAllMocks())

describe('findCategoryByName', () => {
  it('encuentra pese a mayusculas, acentos y espacios', async () => {
    conCategorias('Compras internet')

    expect((await findCategoryByName('emp-1', 'compras internet'))?.id).toBe('cat-0')
    expect((await findCategoryByName('emp-1', 'COMPRAS INTERNET'))?.id).toBe('cat-0')
    expect((await findCategoryByName('emp-1', '  Compras   internet '))?.id).toBe('cat-0')
  })

  it('NO empareja por subcadena', async () => {
    // El bug del importador de Excel: `contains` hacia que una fila con
    // categoria "Compras" cayera en "Compras internet".
    conCategorias('Compras internet', 'Compras oficina')

    expect(await findCategoryByName('emp-1', 'Compras')).toBeNull()
    expect(await findCategoryByName('emp-1', 'internet')).toBeNull()
  })

  it('distingue categorias parecidas pero distintas', async () => {
    conCategorias('Compras internet', 'Compras oficina')

    expect((await findCategoryByName('emp-1', 'compras oficina'))?.name).toBe('Compras oficina')
  })

  it('filtra por empresa', async () => {
    conCategorias()

    await findCategoryByName('emp-1', 'Otros')

    expect(db.expenseCategory.findMany).toHaveBeenCalledWith({ where: { companyId: 'emp-1' } })
  })

  it('con nombre vacio no consulta la base', async () => {
    expect(await findCategoryByName('emp-1', '   ')).toBeNull()
    expect(db.expenseCategory.findMany).not.toHaveBeenCalled()
  })

  it('devuelve null si no hay ninguna coincidencia', async () => {
    conCategorias('Salarios')
    expect(await findCategoryByName('emp-1', 'Otros')).toBeNull()
  })
})
