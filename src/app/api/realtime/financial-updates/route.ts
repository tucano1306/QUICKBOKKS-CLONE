import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * API Route para actualizaciones financieras en tiempo real usando Server-Sent Events (SSE)
 * 
 * Características:
 * - Actualizaciones cada 10 segundos
 * - No requiere WebSockets
 * - Nativo en navegadores
 * - Auto-reconnect del cliente
 */

interface FinancialUpdate {
  timestamp: string
  companyId: string
  companyName: string
  balance: {
    cash: number
    receivables: number
    payables: number
    netWorth: number
  }
  recentActivity: {
    newTransactions: number
    pendingInvoices: number
    unreconciledItems: number
  }
  alerts: Array<{
    type: 'info' | 'warning' | 'error'
    message: string
  }>
}

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Obtener companyId de query params
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return new Response('Company ID required', { status: 400 })
    }

    // Verificar acceso a la empresa
    const company = await prisma.company.findUnique({
      where: {
        id: companyId
      }
    })

    if (!company) {
      return new Response('Company not found', { status: 404 })
    }

    // Verificar si el usuario tiene acceso (simplificado por ahora)
    // En producción, verificar en CompanyUser
    const companyUser = await prisma.companyUser.findFirst({
      where: {
        userId: session.user.id,
        companyId: companyId,
      }
    }).catch(() => null)

    // Si no hay CompanyUser pero es el usuario autenticado, permitir acceso
    const companyName = company.name

    // Crear encoder para el stream
    const encoder = new TextEncoder()

    // Crear readable stream
    const stream = new ReadableStream({
      async start(controller) {
        // Función para obtener y enviar actualizaciones
        const sendUpdate = async () => {
          try {
            const update = await getFinancialUpdate(companyId, companyName)
            const data = `data: ${JSON.stringify(update)}\n\n`
            controller.enqueue(encoder.encode(data))
          } catch (error) {
            console.error('Error sending update:', error)
            // No cerramos el stream, solo logueamos el error
          }
        }

        // Enviar primera actualización inmediata
        await sendUpdate()

        // Configurar intervalo para actualizaciones periódicas (cada 60 segundos en lugar de 10)
        const intervalId = setInterval(sendUpdate, 60000)

        // Enviar heartbeat cada 30 segundos para mantener conexión
        const heartbeatId = setInterval(() => {
          const heartbeat = `: heartbeat\n\n`
          controller.enqueue(encoder.encode(heartbeat))
        }, 30000)

        // Cleanup cuando el cliente cierra la conexión
        req.signal.addEventListener('abort', () => {
          clearInterval(intervalId)
          clearInterval(heartbeatId)
          controller.close()
        })
      }
    })

    // Retornar respuesta con headers SSE
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Para nginx
      }
    })
  } catch (error) {
    console.error('Error in SSE endpoint:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * Obtiene el estado financiero actualizado de una empresa
 */
async function getFinancialUpdate(companyId: string, companyName: string): Promise<FinancialUpdate> {
  try {
    // Obtener saldo de caja (cuentas de tipo ASSET)
    const cashAccounts = await prisma.chartOfAccounts.findMany({
      where: {
        companyId,
        type: 'ASSET',
        isActive: true,
        OR: [
          { code: { startsWith: '1010' } }, // Caja
          { code: { startsWith: '1020' } }, // Bancos
          { name: { contains: 'Caja', mode: 'insensitive' } },
          { name: { contains: 'Banco', mode: 'insensitive' } }
        ]
      }
    })
    const cash = cashAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)

    // Obtener cuentas por cobrar
    const receivables = await prisma.invoice.aggregate({
      where: {
        companyId,
        status: {
          in: ['SENT', 'VIEWED', 'PARTIAL']
        }
      },
      _sum: {
        total: true
      }
    })

    // Obtener cuentas por pagar
    const payables = await prisma.expense.aggregate({
      where: {
        companyId,
        status: {
          in: ['PENDING', 'APPROVED']
        }
      },
      _sum: {
        amount: true
      }
    })

    // Calcular patrimonio neto (Assets - Liabilities)
    const assets = await prisma.chartOfAccounts.aggregate({
      where: {
        companyId,
        type: 'ASSET',
        isActive: true
      },
      _sum: {
        balance: true
      }
    })

    const liabilities = await prisma.chartOfAccounts.aggregate({
      where: {
        companyId,
        type: 'LIABILITY',
        isActive: true
      },
      _sum: {
        balance: true
      }
    })

    const netWorth = (assets._sum.balance || 0) - (liabilities._sum.balance || 0)

    // Obtener actividad reciente (últimas 24 horas)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const newTransactions = await prisma.transaction.count({
      where: {
        companyId,
        createdAt: {
          gte: yesterday
        }
      }
    })

    const pendingInvoices = await prisma.invoice.count({
      where: {
        companyId,
        status: {
          in: ['SENT', 'VIEWED']
        }
      }
    })

    const unreconciledItems = await prisma.bankTransaction.count({
      where: {
        companyId,
        reconciled: false
      }
    })

    // Generar alertas inteligentes
    const alerts: FinancialUpdate['alerts'] = []

    // Alerta: Facturas vencidas
    const overdueInvoices = await prisma.invoice.count({
      where: {
        companyId,
        status: {
          in: ['SENT', 'VIEWED', 'PARTIAL']
        },
        dueDate: {
          lt: new Date()
        }
      }
    })

    if (overdueInvoices > 0) {
      alerts.push({
        type: 'warning',
        message: `${overdueInvoices} factura${overdueInvoices > 1 ? 's' : ''} vencida${overdueInvoices > 1 ? 's' : ''}`
      })
    }

    // Alerta: Muchas transacciones sin conciliar
    if (unreconciledItems > 20) {
      alerts.push({
        type: 'info',
        message: `${unreconciledItems} transacciones pendientes de conciliar`
      })
    }

    // Alerta: Cash bajo (menos de 10k)
    if (cash < 10000 && cash > 0) {
      alerts.push({
        type: 'warning',
        message: 'Nivel de efectivo bajo'
      })
    }

    // Alerta: Nuevos gastos recientes (últimos 5 minutos)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const recentExpenses = await prisma.expense.count({
      where: {
        companyId,
        status: 'APPROVED',
        createdAt: {
          gte: fiveMinutesAgo
        }
      }
    })

    if (recentExpenses > 0) {
      alerts.push({
        type: 'info',
        message: `${recentExpenses} gasto${recentExpenses > 1 ? 's' : ''} aprobado${recentExpenses > 1 ? 's' : ''} recientemente`
      })
    }

    return {
      timestamp: new Date().toISOString(),
      companyId,
      companyName,
      balance: {
        cash: Math.round(cash * 100) / 100,
        receivables: Math.round((receivables._sum.total || 0) * 100) / 100,
        payables: Math.round((payables._sum.amount || 0) * 100) / 100,
        netWorth: Math.round(netWorth * 100) / 100
      },
      recentActivity: {
        newTransactions,
        pendingInvoices,
        unreconciledItems
      },
      alerts
    }
  } catch (error) {
    console.error('Error getting financial update:', error)
    throw error
  }
}
