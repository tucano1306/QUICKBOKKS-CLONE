import { NextRequest, NextResponse } from 'next/server'
import { runOilChangeAlerts } from '@/lib/vehicle-alerts-service'
import { sendPendingNotificationEmails } from '@/lib/notification-email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Trabajo diario: detecta cambios de aceite proximos y reparte los avisos.
 *
 * Lo llama el cron de Vercel, que manda la cabecera Authorization con
 * CRON_SECRET. Sin ese secreto la ruta responde 401: es un endpoint que
 * escribe en la base y manda correos, asi que no puede quedar abierto.
 *
 * Es idempotente. El indice unico (userId, dedupeKey) hace que ejecutarlo
 * varias veces el mismo dia no duplique ningun aviso.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    // Sin secreto configurado la ruta se queda cerrada, no abierta.
    return NextResponse.json(
      { error: 'CRON_SECRET no está configurado' },
      { status: 503 }
    )
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const alerts = await runOilChangeAlerts()
    const email = await sendPendingNotificationEmails()

    return NextResponse.json({
      ok: true,
      alerts,
      email,
      ranAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error en el trabajo de avisos:', error)
    return NextResponse.json(
      {
        error: 'Error ejecutando los avisos',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
