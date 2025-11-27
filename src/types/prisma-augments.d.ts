import type { PrismaClient } from '@prisma/client'

declare module '@prisma/client' {
  interface PrismaClient {
    vendor: any
    vendorPayable: any
  }

  type VendorStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  type PayableStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE'
}
