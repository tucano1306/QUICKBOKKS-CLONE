/**
 * Aislamiento en las rutas de activos.
 *
 * `/api/accounting/assets` sin companyId devolvia los activos de TODAS las
 * empresas a cualquiera con sesion, y `/api/accounting/assets/[id]` dejaba
 * leer, modificar y BORRAR un activo ajeno sabiendo el id.
 *
 * Esa fuga era ademas la razon por la que la pantalla vieja parecia funcionar:
 * mostraba la camioneta desde cualquier empresa porque las veia todas.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    companyUser: { findFirst: jest.fn() },
    asset: { findUnique: jest.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { resolveAssetAccess, userCanAccessCompany } from '@/lib/company-access'

const db = prisma as unknown as {
  companyUser: { findFirst: jest.Mock }
  asset: { findUnique: jest.Mock }
}

const VENECORO = 'cmjnfngxx00024yvszbcr5yf1'
const AJENA = 'empresa-de-otro'

beforeEach(() => jest.clearAllMocks())

describe('lectura del listado de activos', () => {
  it('el miembro entra en su empresa', async () => {
    db.companyUser.findFirst.mockResolvedValue({ id: 'cu-1' })

    expect(await userCanAccessCompany('u-1', VENECORO)).toBe(true)
  })

  it('cambiar el companyId en la URL ya no sirve de nada', async () => {
    db.companyUser.findFirst.mockResolvedValue(null)

    expect(await userCanAccessCompany('u-1', AJENA)).toBe(false)
  })
})

describe('activo concreto por id', () => {
  it('no se puede tocar el activo de otra empresa', async () => {
    db.asset.findUnique.mockResolvedValue({ companyId: AJENA })
    db.companyUser.findFirst.mockResolvedValue(null)

    // Vale para GET, PUT y DELETE: los tres pasan por la misma guarda.
    expect((await resolveAssetAccess('u-1', 'act-ajeno')).status).toBe(403)
  })

  it('el propio activo si se puede tocar', async () => {
    db.asset.findUnique.mockResolvedValue({ companyId: VENECORO })
    db.companyUser.findFirst.mockResolvedValue({ id: 'cu-1' })

    const r = await resolveAssetAccess('u-1', 'act-propio')

    expect(r.status).toBe(200)
    expect(r.companyId).toBe(VENECORO)
  })

  it('un id inventado da 404, no 403: no confirma que exista', async () => {
    db.asset.findUnique.mockResolvedValue(null)

    expect((await resolveAssetAccess('u-1', 'inventado')).status).toBe(404)
  })

  it('el activo compartido (sin empresa) sigue siendo visible', async () => {
    db.asset.findUnique.mockResolvedValue({ companyId: null })

    const r = await resolveAssetAccess('u-1', 'act-compartido')

    expect(r.status).toBe(200)
    expect(db.companyUser.findFirst).not.toHaveBeenCalled()
  })
})
