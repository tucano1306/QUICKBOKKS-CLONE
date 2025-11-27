import type { PayableStatus } from '@prisma/client'
import { prisma } from './prisma'

const EPSILON = 0.01
const PAYABLE_STATUS = {
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  PARTIAL: 'PARTIAL',
  UNPAID: 'UNPAID',
} as const satisfies Record<PayableStatus, PayableStatus>

export async function generateVendorNumber(companyId?: string | null) {
  const prefix = 'PROV'
  const where: Record<string, any> = {}

  if (companyId) {
    where.companyId = companyId
  }

  let sequence = await prisma.vendor.count({ where }) + 1

  while (true) {
    const candidate = `${prefix}-${sequence.toString().padStart(4, '0')}`
    const existing = await prisma.vendor.findUnique({ where: { vendorNumber: candidate } })

    if (!existing) {
      return candidate
    }

    sequence += 1
  }
}

export function resolvePayableStatus(total: number, paidAmount: number, dueDate: Date): PayableStatus {
  const normalizedTotal = Number(total) || 0
  const normalizedPaid = Number(paidAmount) || 0
  const outstanding = normalizedTotal - normalizedPaid
  const hasOutstanding = outstanding > EPSILON
  const isPastDue = dueDate.getTime() < Date.now()

  if (!hasOutstanding) {
    return PAYABLE_STATUS.PAID
  }

  if (isPastDue) {
    return PAYABLE_STATUS.OVERDUE
  }

  if (normalizedPaid > 0 && normalizedPaid < normalizedTotal) {
    return PAYABLE_STATUS.PARTIAL
  }

  return PAYABLE_STATUS.UNPAID
}

export function calculateRemainingBalance(total: number, paidAmount: number) {
  return Math.max(Number(total) - Number(paidAmount || 0), 0)
}

export async function recalculateVendorFinancials(vendorId: string) {
  const aggregates = await prisma.vendorPayable.aggregate({
    where: { vendorId },
    _sum: {
      total: true,
      balance: true,
    },
  })

  const totalPurchases = aggregates._sum.total || 0
  const currentBalance = aggregates._sum.balance || 0

  return prisma.vendor.update({
    where: { id: vendorId },
    data: {
      totalPurchases,
      currentBalance,
    },
  })
}
