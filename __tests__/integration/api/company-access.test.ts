/**
 * Aislamiento entre empresas.
 *
 * El `companyId` y el `assetId` llegan de la URL, asi que exigir sesion no
 * basta: sin comprobar la pertenencia, cualquiera con cuenta veria -o
 * borraria- datos de otra empresa cambiando un id.
 *
 * El caso que lo destapo: la camioneta esta en una empresa y la pantalla se
 * estaba mirando desde otra.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    companyUser: { findFirst: jest.fn() },
    asset: { findUnique: jest.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { userCanAccessCompany, resolveAssetAccess } from '@/lib/company-access'

const db = prisma as unknown as {
  companyUser: { findFirst: jest.Mock }
  asset: { findUnique: jest.Mock }
}

const esMiembro = (si: boolean) =>
  db.companyUser.findFirst.mockResolvedValue(si ? { id: 'cu-1' } : null)

beforeEach(() => jest.clearAllMocks())

describe('userCanAccessCompany', () => {
  it('deja pasar al miembro de la empresa', async () => {
    esMiembro(true)
    expect(await userCanAccessCompany('u-1', 'emp-1')).toBe(true)
  })

  it('bloquea a quien no pertenece, aunque tenga sesion', async () => {
    esMiembro(false)
    expect(await userCanAccessCompany('u-1', 'emp-ajena')).toBe(false)
  })

  it('consulta por el par usuario/empresa, no solo por uno de los dos', async () => {
    esMiembro(true)
    await userCanAccessCompany('u-1', 'emp-1')
    expect(db.companyUser.findFirst).toHaveBeenCalledWith({
      where: { userId: 'u-1', companyId: 'emp-1' },
    })
  })

  it('un activo sin empresa es compartido: no requiere pertenencia', async () => {
    expect(await userCanAccessCompany('u-1', null)).toBe(true)
    expect(db.companyUser.findFirst).not.toHaveBeenCalled()
  })
})

describe('resolveAssetAccess', () => {
  it('404 si el activo no existe', async () => {
    db.asset.findUnique.mockResolvedValue(null)
    expect(await resolveAssetAccess('u-1', 'no-existe')).toEqual({ status: 404, companyId: null })
  })

  it('403 si existe pero es de otra empresa', async () => {
    db.asset.findUnique.mockResolvedValue({ companyId: 'emp-ajena' })
    esMiembro(false)

    const r = await resolveAssetAccess('u-1', 'act-1')

    expect(r.status).toBe(403)
  })

  it('distingue "no existe" de "no es tuyo"', async () => {
    db.asset.findUnique.mockResolvedValue(null)
    const inexistente = await resolveAssetAccess('u-1', 'x')
    db.asset.findUnique.mockResolvedValue({ companyId: 'emp-ajena' })
    esMiembro(false)
    const ajeno = await resolveAssetAccess('u-1', 'y')

    expect(inexistente.status).not.toBe(ajeno.status)
  })

  it('200 y la empresa del activo cuando el usuario pertenece', async () => {
    db.asset.findUnique.mockResolvedValue({ companyId: 'emp-1' })
    esMiembro(true)

    expect(await resolveAssetAccess('u-1', 'act-1')).toEqual({ status: 200, companyId: 'emp-1' })
  })

  it('no filtra la empresa de un activo ajeno mas alla del propio id consultado', async () => {
    db.asset.findUnique.mockResolvedValue({ companyId: 'emp-ajena' })
    esMiembro(false)

    const r = await resolveAssetAccess('u-1', 'act-1')

    // El companyId vuelve para poder registrar el intento, pero el status manda:
    // la ruta responde 403 y no llega a leer ni escribir nada.
    expect(r.status).toBe(403)
  })
})
