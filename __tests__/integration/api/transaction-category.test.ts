/**
 * Cierre de la causa raiz de las categorias repetidas.
 *
 * Un diagnostico sobre los datos reales mostro que las variantes NO estaban en
 * la tabla ExpenseCategory (que no tenia ninguna duplicada) sino en
 * `Transaction.category`, que es texto libre: convivian "Compras internet" y
 * "compras internet", "Celular" y "celular", "Restaurante" y "restaurante".
 *
 * El reporte ya las agrupa bien; esto evita que se sigan creando.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: { transaction: { findMany: jest.fn() } },
}))

import { prisma } from '@/lib/prisma'
import { canonicalTransactionCategory } from '@/lib/transaction-category'

const db = prisma as unknown as { transaction: { findMany: jest.Mock } }

const conCategorias = (...nombres: string[]) =>
  db.transaction.findMany.mockResolvedValue(nombres.map((category) => ({ category })))

beforeEach(() => jest.clearAllMocks())

describe('canonicalTransactionCategory', () => {
  it('reutiliza la forma que ya existe en vez de crear otra variante', async () => {
    conCategorias('Compras internet', 'Salarios')

    expect(await canonicalTransactionCategory('emp-1', 'compras internet')).toBe('Compras internet')
    expect(await canonicalTransactionCategory('emp-1', 'COMPRAS INTERNET')).toBe('Compras internet')
    expect(await canonicalTransactionCategory('emp-1', '  compras   internet ')).toBe('Compras internet')
  })

  it('tambien unifica los otros dos casos vistos en los datos reales', async () => {
    conCategorias('Celular', 'Restaurante')

    expect(await canonicalTransactionCategory('emp-1', 'celular')).toBe('Celular')
    expect(await canonicalTransactionCategory('emp-1', 'restaurante')).toBe('Restaurante')
  })

  it('si no hay ninguna previa, respeta como lo escribio el usuario', async () => {
    conCategorias('Salarios')

    // No se impone un formato: solo se recortan los espacios.
    expect(await canonicalTransactionCategory('emp-1', '  gastos varios ')).toBe('gastos varios')
    expect(await canonicalTransactionCategory('emp-1', 'Gastos Varios')).toBe('Gastos Varios')
  })

  it('no toca categorias que de verdad son distintas', async () => {
    conCategorias('Compras internet')

    expect(await canonicalTransactionCategory('emp-1', 'Compras oficina')).toBe('Compras oficina')
  })

  it('solo mira las categorias de la misma empresa', async () => {
    conCategorias()

    await canonicalTransactionCategory('emp-1', 'Celular')

    expect(db.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId: 'emp-1' }) })
    )
  })

  it('con un nombre vacio no consulta la base', async () => {
    expect(await canonicalTransactionCategory('emp-1', '   ')).toBe('')
    expect(db.transaction.findMany).not.toHaveBeenCalled()
  })
})
