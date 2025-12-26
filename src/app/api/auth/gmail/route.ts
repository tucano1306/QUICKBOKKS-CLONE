import { NextRequest, NextResponse } from 'next/server'
import { getGmailService } from '@/lib/gmail-service'

// Forzar renderizado dinámico para esta ruta API
export const dynamic = 'force-dynamic'

/**
 * Ruta para iniciar autenticación OAuth con Gmail
 * GET /api/auth/gmail → Redirige a Google para autorizar
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const gmailService = getGmailService()

    // Verificar si ya está autenticado
    if (action === 'status') {
      return NextResponse.json({
        authenticated: gmailService.isAuthenticated(),
        configured: !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET)
      })
    }

    // Generar URL de autorización
    if (action === 'authorize' || !action) {
      const authUrl = gmailService.getAuthUrl()
      
      // Redirigir a Google
      return NextResponse.redirect(authUrl)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Gmail auth error:', error)
    return NextResponse.json({ 
      error: 'Error initializing Gmail auth',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
