/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

/**
 * POST /api/integrations/foody: firma, validacion y la empresa que fija este
 * lado. El reparto en si lo prueba foody-aplicar.test.ts.
 */

const SECRETO = 'secreto-de-prueba-foody-computo-0123456789'

const aplicarLoteFoody = jest.fn()
const findUnique = jest.fn()
jest.mock('@/lib/foody-integration/aplicar', () => ({ aplicarLoteFoody: (...a: unknown[]) => aplicarLoteFoody(...a) }))
jest.mock('@/lib/prisma', () => ({ prisma: { company: { findUnique: (...a: unknown[]) => findUnique(...a) } } }))

import { POST } from '@/app/api/integrations/foody/route'
import { cabeceraFirma } from '@/lib/foody-integration/firma'

function peticion(cuerpo: unknown, firma: string | null = 'auto') {
  const texto = JSON.stringify(cuerpo)
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (firma === 'auto') headers['x-foody-signature'] = cabeceraFirma(SECRETO, texto)
  else if (firma) headers['x-foody-signature'] = firma
  return new NextRequest('http://localhost/api/integrations/foody', { method: 'POST', body: texto, headers })
}

const lote = {
  upserts: [{ ref: 'trip:t1:grocery', fecha: '2026-10-06', monto: 20.68, categoria: 'Supermercado', descripcion: 'Publix' }],
  borrar: [],
}

const EMPRESAS: Record<string, { id: string; name: string; isActive: boolean }> = {
  leonardo: { id: 'leonardo', name: 'Leonardo ', isActive: true },
  venecoro: { id: 'venecoro', name: 'Venecoro', isActive: true },
}

beforeEach(() => {
  process.env.FOODY_SECRET = SECRETO
  process.env.FOODY_COMPANY_ID = 'leonardo'
  delete process.env.FOODY_BUSINESS_COMPANY_ID
  aplicarLoteFoody.mockReset()
  findUnique.mockReset().mockImplementation(async ({ where }: { where: { id: string } }) => EMPRESAS[where.id] ?? null)
})

describe('POST /api/integrations/foody', () => {
  it('sin configurar responde 503 y no toca nada', async () => {
    delete process.env.FOODY_SECRET
    const res = await POST(peticion(lote))
    expect(res.status).toBe(503)
    expect(aplicarLoteFoody).not.toHaveBeenCalled()
  })

  it('sin firma, o con una falsa, 401', async () => {
    expect((await POST(peticion(lote, null))).status).toBe(401)
    expect((await POST(peticion(lote, 't=1,v1=' + 'a'.repeat(64)))).status).toBe(401)
    expect(aplicarLoteFoody).not.toHaveBeenCalled()
  })

  it('el ping contesta con la empresa en la que se escribe', async () => {
    const res = await POST(peticion({ ping: true }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, empresa: { id: 'leonardo', nombre: 'Leonardo' }, empresaNegocio: null })
  })

  it('con empresa de negocio, el ping dice las dos', async () => {
    process.env.FOODY_BUSINESS_COMPANY_ID = 'venecoro'
    const res = await POST(peticion({ ping: true }))
    expect(await res.json()).toEqual({
      ok: true,
      empresa: { id: 'leonardo', nombre: 'Leonardo' },
      empresaNegocio: { id: 'venecoro', nombre: 'Venecoro' },
    })
  })

  it('un lote mal formado es 422', async () => {
    const res = await POST(peticion({ upserts: [{ ref: 'otra-cosa', monto: -1 }] }))
    expect(res.status).toBe(422)
  })

  it('un lote valido se aplica en la empresa de la configuracion, no en otra', async () => {
    aplicarLoteFoody.mockResolvedValue({ resultados: [{ ref: 'trip:t1:grocery', accion: 'creado', id: 'x' }], porAccion: { creado: 1 } })
    const res = await POST(peticion({ ...lote, companyId: 'otra-empresa' }))
    expect(res.status).toBe(200)
    expect(aplicarLoteFoody).toHaveBeenCalledWith('leonardo', expect.objectContaining({ simular: false }), null)
    expect((await res.json()).porAccion).toEqual({ creado: 1 })
  })

  it('lo de negocio va a la empresa de negocio de la configuracion', async () => {
    process.env.FOODY_BUSINESS_COMPANY_ID = 'venecoro'
    aplicarLoteFoody.mockResolvedValue({ resultados: [], porAccion: {} })
    await POST(peticion(lote))
    expect(aplicarLoteFoody).toHaveBeenCalledWith('leonardo', expect.anything(), 'venecoro')
    // Sin decir nada, un gasto es personal.
    expect(aplicarLoteFoody.mock.calls[0][1].upserts[0].destino).toBe('personal')
  })

  it('una empresa de negocio inactiva no para lo personal: se pasa como si no hubiera', async () => {
    process.env.FOODY_BUSINESS_COMPANY_ID = 'venecoro'
    findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
      where.id === 'venecoro' ? { ...EMPRESAS.venecoro, isActive: false } : EMPRESAS[where.id]
    )
    aplicarLoteFoody.mockResolvedValue({ resultados: [], porAccion: {} })
    const res = await POST(peticion(lote))
    expect(res.status).toBe(200)
    expect(aplicarLoteFoody).toHaveBeenCalledWith('leonardo', expect.anything(), null)
    expect((await res.json()).empresaNegocio).toBeNull()
  })

  it('la misma empresa como personal y de negocio no separa nada', async () => {
    process.env.FOODY_BUSINESS_COMPANY_ID = 'leonardo'
    aplicarLoteFoody.mockResolvedValue({ resultados: [], porAccion: {} })
    await POST(peticion(lote))
    expect(aplicarLoteFoody).toHaveBeenCalledWith('leonardo', expect.anything(), null)
  })

  it('si la empresa configurada esta inactiva, 409', async () => {
    findUnique.mockResolvedValue({ id: 'leonardo', name: 'Leonardo', isActive: false })
    expect((await POST(peticion(lote))).status).toBe(409)
  })
})
