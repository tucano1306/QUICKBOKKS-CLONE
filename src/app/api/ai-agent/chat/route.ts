import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  chatWithAgent,
  createAgentConversation,
  getAgentHistory,
  getUserConversations,
  type AgentContext,
} from '@/lib/ai-agent-service';

/**
 * POST /api/ai-agent/chat
 * Envía un mensaje al agente IA
 * 
 * Body:
 * {
 *   "message": "Crea una factura para el cliente ABC por $5,000",
 *   "conversationId": "optional-conversation-id",
 *   "companyId": "optional-company-id"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, conversationId, companyId: bodyCompanyId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Se requiere un mensaje válido' },
        { status: 400 }
      );
    }

    // Obtener companyId del body, o buscar la primera empresa del usuario
    let companyId = bodyCompanyId;
    if (!companyId) {
      try {
        // Buscar empresa a través de CompanyUser
        const companyUser = await prisma.companyUser.findFirst({
          where: { userId: session.user.id },
          select: { companyId: true }
        });
        companyId = companyUser?.companyId;
      } catch (e) {
        // Si no hay empresas, usar el userId como fallback
        companyId = null;
      }
    }

    // Si no hay empresa, el chat funciona sin guardar en DB
    let convId = conversationId;
    let history: any[] = [];
    
    if (companyId) {
      // Obtener o crear conversación solo si hay empresa
      if (!convId) {
        convId = await createAgentConversation(
          companyId,
          session.user.id
        );
      }
      // Obtener historial de la conversación
      history = await getAgentHistory(convId, 10);
    } else {
      convId = `temp_${Date.now()}`;
    }

    // Crear contexto del agente
    const context: AgentContext = {
      conversationId: convId,
      companyId: companyId || session.user.id,
      userId: session.user.id,
      history,
    };

    // Enviar mensaje al agente
    const response = await chatWithAgent(context, message);

    return NextResponse.json({
      ...response,
      conversationId: convId,
    });
  } catch (error: any) {
    console.error('Error en AI Agent chat:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error procesando solicitud',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-agent/chat?conversationId=xxx
 * Obtiene el historial de una conversación
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      // Obtener historial de conversación específica
      const history = await getAgentHistory(conversationId, 100);
      return NextResponse.json({ history });
    } else {
      // Obtener todas las conversaciones del usuario
      const conversations = await getUserConversations(
        session.user.id,
        session.user.id
      );
      return NextResponse.json({ conversations });
    }
  } catch (error: any) {
    console.error('Error obteniendo conversaciones:', error);
    return NextResponse.json(
      { error: error.message || 'Error obteniendo datos' },
      { status: 500 }
    );
  }
}
