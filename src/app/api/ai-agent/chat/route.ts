import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
 *   "conversationId": "optional-conversation-id"
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
    const { message, conversationId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Se requiere un mensaje válido' },
        { status: 400 }
      );
    }

    // Obtener o crear conversación
    let convId = conversationId;
    if (!convId) {
      convId = await createAgentConversation(
        session.user.id, // companyId
        session.user.id   // userId
      );
    }

    // Obtener historial de la conversación
    const history = await getAgentHistory(convId, 10);

    // Crear contexto del agente
    const context: AgentContext = {
      conversationId: convId,
      companyId: session.user.id,
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
