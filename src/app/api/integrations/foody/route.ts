import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aplicarLoteFoody } from '@/lib/foody-integration/aplicar'
import { configFoody } from '@/lib/foody-integration/config'
import { verificarFirma } from '@/lib/foody-integration/firma'
import { loteFoodySchema, pingFoodySchema, type LoteFoody } from '@/lib/foody-integration/lote'

export const dynamic = 'force-dynamic'

/** Un lote de 200 gastos ronda los 60 kB: 1 MB es margen de sobra. */
const MAX_CUERPO = 1_000_000

/**
 * POST /api/integrations/foody — Foody manda aqui sus gastos.
 *
 * No hay sesion: quien llama es el servidor de Foody, no un navegador. Se
 * autentica con la firma HMAC de la cabecera `x-foody-signature` (ver
 * firma.ts), y la empresa en la que escribe la fija ESTE lado
 * (FOODY_COMPANY_ID), nunca el cuerpo: aunque alguien tuviera una firma
 * valida, no podria elegir otra empresa.
 *
 * Cuerpo: `{ ping: true }` para comprobar la conexion, o
 * `{ upserts, borrar, simular }` para aplicar (o previsualizar) un lote.
 */
export async function POST(request: NextRequest) {
  const config = configFoody()
  if (!config) {
    return NextResponse.json({ error: 'La integracion con Foody no esta configurada' }, { status: 503 })
  }

  const cuerpo = await request.text()
  if (cuerpo.length > MAX_CUERPO) {
    return NextResponse.json({ error: 'Lote demasiado grande' }, { status: 413 })
  }

  const firma = verificarFirma(config.secreto, request.headers.get('x-foody-signature'), cuerpo)
  if (!firma.ok) return NextResponse.json({ error: firma.motivo }, { status: 401 })

  let json: unknown
  try {
    json = JSON.parse(cuerpo)
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
  }

  const esPing = pingFoodySchema.safeParse(json).success
  const lote = esPing ? null : loteFoodySchema.safeParse(json)
  if (lote && !lote.success) {
    return NextResponse.json({ error: 'Lote invalido', detalles: lote.error.issues.slice(0, 5) }, { status: 422 })
  }

  const empresa = await prisma.company.findUnique({
    where: { id: config.companyId },
    select: { id: true, name: true, isActive: true },
  })
  if (!empresa?.isActive) {
    return NextResponse.json({ error: 'La empresa configurada no existe o esta inactiva' }, { status: 409 })
  }
  const datosEmpresa = { id: empresa.id, nombre: empresa.name.trim() }

  if (esPing || !lote) return NextResponse.json({ ok: true, empresa: datosEmpresa })

  const datos = lote.data as LoteFoody
  try {
    const resumen = await aplicarLoteFoody(empresa.id, datos)
    return NextResponse.json({ ok: true, empresa: datosEmpresa, simulado: datos.simular, ...resumen })
  } catch (error) {
    console.error('[foody] error aplicando lote:', error)
    return NextResponse.json({ error: 'No se pudo aplicar el lote' }, { status: 500 })
  }
}
