import { NextRequest, NextResponse } from 'next/server'
import { getGmailService } from '@/lib/gmail-service'

// Forzar renderizado dinámico para esta ruta API
export const dynamic = 'force-dynamic'

/**
 * Callback de OAuth de Gmail
 * GET /api/auth/gmail/callback?code=XXX → Procesa el código de autorización
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // Google devolvió un error
    if (error) {
      console.error('Gmail OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/company/settings/integrations?gmail_error=${encodeURIComponent(error)}`
      )
    }

    // No hay código de autorización
    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/company/settings/integrations?gmail_error=no_code`
      )
    }

    // Intercambiar código por tokens
    const gmailService = getGmailService()
    const tokens = await gmailService.getTokensFromCode(code)

    // En producción, guardarías los tokens en la base de datos
    // Por ahora, los guardamos en memoria del servicio (ya lo hace getTokenFromCode)
    
    console.log('Gmail OAuth successful, tokens received')
    console.log('Access token expires:', tokens.expiry_date ? new Date(tokens.expiry_date) : 'N/A')

    // Redirigir a página de éxito
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/company/settings/integrations?gmail_success=true`
    )

  } catch (error) {
    console.error('Gmail callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/company/settings/integrations?gmail_error=${encodeURIComponent(
        error instanceof Error ? error.message : 'unknown_error'
      )}`
    )
  }
}
