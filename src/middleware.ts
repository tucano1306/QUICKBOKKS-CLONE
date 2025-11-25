import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Rutas que no requieren autenticación
const publicRoutes = ['/auth/login', '/auth/register', '/api/auth']

// Rutas que requieren roles específicos
const protectedRoutes: { [key: string]: string[] } = {
  '/api/accounting/chart-of-accounts': ['ADMIN', 'ACCOUNTANT'],
  '/api/accounting/journal-entries': ['ADMIN', 'ACCOUNTANT'],
  '/api/accounting/depreciation': ['ADMIN', 'ACCOUNTANT'],
  '/api/reports/balance-sheet': ['ADMIN', 'ACCOUNTANT', 'USER'],
  '/api/reports/income-statement': ['ADMIN', 'ACCOUNTANT', 'USER'],
  '/api/reports/cash-flow': ['ADMIN', 'ACCOUNTANT', 'USER'],
  '/settings': ['ADMIN'],
  '/api/users': ['ADMIN']
}

export default async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  const path = request.nextUrl.pathname
  
  // Verificar si es una ruta pública
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route))
  
  if (isPublicRoute) {
    return NextResponse.next()
  }
  
  // Si no hay token y no es ruta pública, redirigir a login
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(loginUrl)
  }
  
  // Verificar permisos específicos de ruta
  for (const [route, allowedRoles] of Object.entries(protectedRoutes)) {
    if (path.startsWith(route)) {
      const userRole = token.role as string
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.json(
          { error: 'No tienes permisos para acceder a este recurso' },
          { status: 403 }
        )
      }
    }
  }
  
  // Agregar headers de seguridad
  const response = NextResponse.next()
  
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  )
  
  // Rate limiting simple (en producción usar Redis)
  const ip = request.ip || 'unknown'
  const rateLimit = await checkRateLimit(ip, path)
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor intenta más tarde.' },
      { status: 429 }
    )
  }
  
  return response
}

// Rate limiting simple en memoria (usar Redis en producción)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

async function checkRateLimit(ip: string, path: string): Promise<{ allowed: boolean }> {
  const key = `${ip}:${path}`
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minuto
  const maxRequests = 100 // 100 requests por minuto
  
  const record = rateLimitStore.get(key)
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
    return { allowed: true }
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false }
  }
  
  record.count++
  return { allowed: true }
}

// Limpiar rate limit store periódicamente
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of Array.from(rateLimitStore.entries())) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000) // Cada 5 minutos

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
