'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Get payment reminders with invoice details
    const reminders = await prisma.paymentReminder.findMany({
      where: { companyId },
      include: {
        invoice: {
          include: {
            customer: true
          }
        }
      },
      orderBy: { sentDate: 'desc' },
      take: 100
    })

    // Transform reminders to frontend format
    const scheduledReminders = reminders.map(reminder => ({
      id: reminder.id,
      invoice: reminder.invoice.invoiceNumber,
      customer: reminder.invoice.customer?.name || 'Unknown',
      amount: reminder.amount,
      dueDate: reminder.dueDate.toISOString().split('T')[0],
      reminderType: getReminderType(reminder.reminderNumber),
      scheduledFor: reminder.sentDate.toISOString().split('T')[0],
      status: reminder.status.toLowerCase() as 'pending' | 'sent' | 'failed'
    }))

    // Create reminder template stats from reminders data
    // Group by reminderNumber to create template summaries
    const templateStats = new Map<number, {
      sent: number
      lastSent: string | null
    }>()

    reminders.forEach(r => {
      const current = templateStats.get(r.reminderNumber) || { sent: 0, lastSent: null }
      current.sent++
      if (!current.lastSent || new Date(r.sentDate) > new Date(current.lastSent)) {
        current.lastSent = r.sentDate.toISOString().split('T')[0]
      }
      templateStats.set(r.reminderNumber, current)
    })

    // Define standard reminder templates
    const templates = [
      {
        id: 'REM-001',
        name: 'Recordatorio de Vencimiento',
        type: 'upcoming' as const,
        schedule: 'before_due',
        days: 3,
        status: 'active' as const,
        channel: 'email' as const,
        sent: templateStats.get(1)?.sent || 0,
        lastSent: templateStats.get(1)?.lastSent,
        template: 'Su factura {invoice_number} vencerá en {days} días'
      },
      {
        id: 'REM-002',
        name: 'Primera Notificación de Mora',
        type: 'overdue' as const,
        schedule: 'after_due',
        days: 1,
        status: 'active' as const,
        channel: 'both' as const,
        sent: templateStats.get(2)?.sent || 0,
        lastSent: templateStats.get(2)?.lastSent,
        template: 'Su factura {invoice_number} está vencida desde hace {days} día'
      },
      {
        id: 'REM-003',
        name: 'Segunda Notificación de Mora',
        type: 'overdue' as const,
        schedule: 'after_due',
        days: 7,
        status: 'active' as const,
        channel: 'email' as const,
        sent: templateStats.get(3)?.sent || 0,
        lastSent: templateStats.get(3)?.lastSent,
        template: 'Recordatorio: Su factura {invoice_number} lleva {days} días vencida'
      },
      {
        id: 'REM-004',
        name: 'Notificación de Mora Final',
        type: 'overdue' as const,
        schedule: 'after_due',
        days: 15,
        status: 'active' as const,
        channel: 'both' as const,
        sent: templateStats.get(4)?.sent || 0,
        lastSent: templateStats.get(4)?.lastSent,
        template: 'URGENTE: Su factura {invoice_number} está vencida desde hace {days} días'
      },
      {
        id: 'REM-005',
        name: 'Recordatorio 7 días antes',
        type: 'upcoming' as const,
        schedule: 'before_due',
        days: 7,
        status: 'active' as const,
        channel: 'email' as const,
        sent: templateStats.get(5)?.sent || 0,
        lastSent: templateStats.get(5)?.lastSent,
        template: 'Recordatorio amistoso: Su factura {invoice_number} vence el {due_date}'
      },
      {
        id: 'REM-006',
        name: 'Agradecimiento por Pago',
        type: 'thank-you' as const,
        schedule: 'on_payment',
        days: 0,
        status: 'active' as const,
        channel: 'email' as const,
        sent: templateStats.get(6)?.sent || 0,
        lastSent: templateStats.get(6)?.lastSent,
        template: 'Gracias por su pago de ${amount}. Su factura {invoice_number} está liquidada'
      }
    ]

    return NextResponse.json({ 
      templates,
      scheduledReminders
    })

  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json({ error: 'Error fetching reminders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { invoiceId, reminderNumber, dueDate, amount, companyId, notes } = body

    if (!invoiceId || !companyId) {
      return NextResponse.json({ error: 'Invoice ID and Company ID required' }, { status: 400 })
    }

    const reminder = await prisma.paymentReminder.create({
      data: {
        invoiceId,
        reminderNumber: reminderNumber || 1,
        sentDate: new Date(),
        dueDate: new Date(dueDate),
        amount: parseFloat(amount),
        status: 'PENDING',
        emailSent: false,
        notes,
        companyId
      },
      include: {
        invoice: {
          include: {
            customer: true
          }
        }
      }
    })

    return NextResponse.json({ reminder }, { status: 201 })

  } catch (error) {
    console.error('Error creating reminder:', error)
    return NextResponse.json({ error: 'Error creating reminder' }, { status: 500 })
  }
}

function getReminderType(reminderNumber: number): string {
  switch (reminderNumber) {
    case 1: return 'Recordatorio de Vencimiento'
    case 2: return 'Primera Notificación de Mora'
    case 3: return 'Segunda Notificación de Mora'
    case 4: return 'Notificación de Mora Final'
    case 5: return 'Recordatorio 7 días antes'
    case 6: return 'Agradecimiento por Pago'
    default: return 'Recordatorio'
  }
}
