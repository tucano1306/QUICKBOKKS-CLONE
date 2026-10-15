/**
 * Integration Tests Setup
 *
 * Las pruebas que importan este archivo escriben en una base de datos DE
 * VERDAD: crean y borran empresas, clientes y usuarios «test-…».
 *
 * Solo corren con TEST_DATABASE_URL, explicita y distinta de cualquier base
 * de la app (ver base-de-pruebas.ts). Sin ella se saltan: antes caian en
 * DATABASE_URL, que es la de produccion, y cada `jest` escribia alli.
 */

import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { motivoParaSaltar } from './base-de-pruebas'

const motivo = motivoParaSaltar(process.env)
export const hayBaseDePruebas = motivo === null

if (motivo) {
  console.warn(`[integracion] Se saltan las pruebas contra base real: ${motivo}. Ver CLAUDE.md.`)
}

/** `describe` si hay base de pruebas segura; si no, `describe.skip`. */
export const describeConBase: jest.Describe = hayBaseDePruebas ? describe : describe.skip

// Sin base de pruebas el cliente se crea apuntando a ninguna parte y nunca se
// conecta: las pruebas que lo usan estan saltadas.
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: hayBaseDePruebas ? process.env.TEST_DATABASE_URL : 'postgresql://localhost:5432/sin_base_de_pruebas',
    },
  },
})

// Mock the prisma import to use our test client
jest.mock('@/lib/prisma', () => ({
  prisma: testPrisma,
}))

beforeAll(async () => {
  if (hayBaseDePruebas) await testPrisma.$connect()
})

afterAll(async () => {
  if (hayBaseDePruebas) await testPrisma.$disconnect()
})

/**
 * Ids con `randomUUID` y no con `Date.now()`: dos altas en el mismo
 * milisegundo chocaban por el id («Unique constraint failed on the fields:
 * (`id`)»). El prefijo «test-» se queda, para reconocer cualquier resto.
 */
export function idDePrueba(tipo: 'company' | 'user' | 'customer'): string {
  return `test-${tipo}-${randomUUID()}`
}

/**
 * Helper function to create test data
 */
export async function createTestCompany() {
  return testPrisma.company.create({
    data: {
      id: idDePrueba('company'),
      name: 'Test Company',
      taxId: 'TEST000000XXX',
      email: 'test@company.com',
      phone: '555-0123',
      address: '123 Test St',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'USA',
      industry: 'Technology',
    },
  })
}

export async function createTestUser() {
  return testPrisma.user.create({
    data: {
      id: idDePrueba('user'),
      name: 'Test User',
      email: `test-${randomUUID()}@example.com`,
      password: 'hashedpassword',
    },
  })
}

export async function createTestCustomer(companyId: string) {
  return testPrisma.customer.create({
    data: {
      id: idDePrueba('customer'),
      name: 'Test Customer',
      email: `customer-${randomUUID()}@example.com`,
      phone: '555-0124',
      address: '456 Customer Ave',
      city: 'Miami',
      state: 'FL',
      zipCode: '33102',
      country: 'USA',
      companyId,
      status: 'ACTIVE',
    },
  })
}

export async function cleanupTestData(ids: {
  companyId?: string
  userId?: string
  customerId?: string
}) {
  if (ids.customerId) {
    await testPrisma.customer.deleteMany({
      where: { id: ids.customerId },
    }).catch(() => {})
  }
  if (ids.companyId) {
    await testPrisma.company.deleteMany({
      where: { id: ids.companyId },
    }).catch(() => {})
  }
  if (ids.userId) {
    await testPrisma.user.deleteMany({
      where: { id: ids.userId },
    }).catch(() => {})
  }
}
