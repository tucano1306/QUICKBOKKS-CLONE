import { prisma } from '@/lib/prisma'
import { findCategoryByName } from '@/lib/expense-category'

/** Una transaccion seleccionada, ya localizada en su tabla de origen. */
export interface ReclassificationTarget {
  id: string
  source: 'bank' | 'expense'
  description: string
  amount: number
  currentCategory: string
}

/**
 * Resuelve la categoria de destino.
 *
 * Prefiere el id, que es lo que manda la pantalla y no depende de como este
 * escrito el nombre. Si en vez de id llega un nombre, se busca con
 * findCategoryByName, que ignora mayusculas y acentos y filtra por empresa.
 */
export async function resolveCategory(
  companyId: string | null,
  newCategoryId?: string | null,
  destinationAccount?: string | null
) {
  if (newCategoryId) {
    return prisma.expenseCategory.findUnique({ where: { id: newCategoryId } })
  }
  if (destinationAccount) {
    return findCategoryByName(companyId, destinationAccount)
  }
  return null
}

/**
 * Localiza cada id en su tabla.
 *
 * La pantalla manda ids sueltos sin decir de donde salen, asi que el servidor
 * lo averigua en lugar de fiarse del cliente. De paso descarta los ids que ya
 * no existen y los de otra empresa, que no deberian reclasificarse desde aqui.
 */
export async function resolveTargets(
  transactionIds: string[],
  companyId: string | null
): Promise<ReclassificationTarget[]> {
  const scope = companyId ? { companyId } : {}

  const [bank, expenses] = await Promise.all([
    prisma.bankTransaction.findMany({
      where: { id: { in: transactionIds }, ...scope },
    }),
    prisma.expense.findMany({
      where: { id: { in: transactionIds }, ...scope },
      include: { category: true },
    }),
  ])

  return [
    ...bank.map((t) => ({
      id: t.id,
      source: 'bank' as const,
      description: t.description || t.name,
      amount: Math.abs(t.amount),
      currentCategory: t.category?.[0] || 'Sin clasificar',
    })),
    ...expenses.map((e) => ({
      id: e.id,
      source: 'expense' as const,
      description: e.description,
      amount: Number(e.amount),
      currentCategory: e.category?.name || 'Sin clasificar',
    })),
  ]
}

/**
 * Aplica la reclasificacion.
 *
 * `BankTransaction.category` es `String[]`, asi que ahi se guarda el NOMBRE de
 * la categoria; `Expense` se repunta por `categoryId`. Por eso hace falta la
 * categoria entera y no solo su id.
 */
export async function executeReclassification(
  targets: ReclassificationTarget[],
  category: { id: string; name: string }
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const t of targets) {
    try {
      if (t.source === 'bank') {
        await prisma.bankTransaction.update({
          where: { id: t.id },
          data: { category: [category.name] }
        })
      } else {
        await prisma.expense.update({
          where: { id: t.id },
          data: { categoryId: category.id }
        })
      }
      success++
    } catch (e) {
      console.error('Error reclassifying transaction:', t.id, e)
      failed++
    }
  }

  return { success, failed }
}
