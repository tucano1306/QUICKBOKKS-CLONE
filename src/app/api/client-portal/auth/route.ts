import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateClientPortal,
  getClientInvoices,
  generateClientStatement,
  uploadClientDocument,
  getClientDocuments,
  getClientDashboardStats,
  getClientNotifications,
  markNotificationAsRead,
  changeClientPortalPassword,
} from '@/lib/client-portal-service';

export const dynamic = 'force-dynamic'

/**
 * POST /api/client-portal/auth - Autenticar cliente
 */
export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();

    switch (action) {
      case 'login': {
        const { email, password } = data;
        if (!email || !password) {
          return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
        }

        const user = await authenticateClientPortal(email, password);

        if (!user) {
          return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
        }

        // En producción, crear JWT token aquí
        return NextResponse.json({ user, token: 'JWT_TOKEN_HERE' });
      }

      case 'change-password': {
        const { customerId, oldPassword, newPassword } = data;
        if (!customerId || !oldPassword || !newPassword) {
          return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 });
        }

        await changeClientPortalPassword(customerId, oldPassword, newPassword);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error en client-portal/auth:', error);
    return NextResponse.json({ error: error.message || 'Error de autenticación' }, { status: 500 });
  }
}
