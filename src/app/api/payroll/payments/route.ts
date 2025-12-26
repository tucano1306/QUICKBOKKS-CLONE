import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Listar pagos de nómina
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const paymentType = searchParams.get('paymentType')
    const status = searchParams.get('status')
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Obtener empleados del usuario
    const employees = await (prisma as any).employee.findMany({
      where: { userId: session.user.id },
      select: { id: true }
    })
    const employeeIds = employees.map((e: any) => e.id)

    const where: any = { employeeId: { in: employeeIds } }

    if (paymentType) where.paymentType = paymentType
    if (status) where.status = status
    if (employeeId) where.employeeId = employeeId
    if (startDate && endDate) {
      where.paymentDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const payments = await (prisma as any).payrollPayment.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            department: true,
            bankAccount: true
          }
        },
        payroll: {
          select: {
            id: true,
            periodStart: true,
            periodEnd: true
          }
        }
      },
      orderBy: { paymentDate: 'desc' }
    })

    // Estadísticas por tipo de pago
    const stats = {
      total: payments.length,
      totalAmount: payments.reduce((sum: number, p: any) => sum + p.amount, 0),
      byType: {
        BANK_TRANSFER: payments.filter((p: any) => p.paymentType === 'BANK_TRANSFER').reduce((sum: number, p: any) => sum + p.amount, 0),
        CASH: payments.filter((p: any) => p.paymentType === 'CASH').reduce((sum: number, p: any) => sum + p.amount, 0),
        CHECK: payments.filter((p: any) => p.paymentType === 'CHECK').reduce((sum: number, p: any) => sum + p.amount, 0),
        DIRECT_DEPOSIT: payments.filter((p: any) => p.paymentType === 'DIRECT_DEPOSIT').reduce((sum: number, p: any) => sum + p.amount, 0)
      },
      pending: payments.filter((p: any) => p.status === 'PENDING').length,
      completed: payments.filter((p: any) => p.status === 'COMPLETED').length
    }

    return NextResponse.json({ payments, stats })
  } catch (error: any) {
    console.error('Error getting payments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Registrar nuevo pago
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await req.json()
    const { employeeId, payrollId, amount, paymentType, paymentDate, reference, bankAccount, notes } = data

    // Verificar empleado
    const employee = await (prisma as any).employee.findFirst({
      where: { id: employeeId, userId: session.user.id }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    }

    // Generar referencia si no se proporciona
    let finalReference = reference
    if (!finalReference) {
      finalReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    }

    const payment = await (prisma as any).payrollPayment.create({
      data: {
        employeeId,
        payrollId,
        amount,
        paymentType,
        paymentDate: new Date(paymentDate),
        reference: finalReference,
        bankAccount: bankAccount || employee.bankAccount,
        notes,
        status: 'PENDING'
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true
          }
        }
      }
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error: any) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Procesar/actualizar pago
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await req.json()
    const { id, action, notes } = data

    const payment = await (prisma as any).payrollPayment.findUnique({
      where: { id },
      include: { employee: true }
    })

    if (!payment || payment.employee.userId !== session.user.id) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    const updateData: any = {}

    switch (action) {
      case 'process':
        updateData.status = 'PROCESSING'
        break
      case 'complete':
        updateData.status = 'COMPLETED'
        updateData.processedAt = new Date()
        break
      case 'fail':
        updateData.status = 'FAILED'
        updateData.notes = notes || payment.notes
        break
      case 'cancel':
        updateData.status = 'CANCELLED'
        updateData.notes = notes || payment.notes
        break
      default:
        // Actualización general
        if (data.amount) updateData.amount = data.amount
        if (data.paymentDate) updateData.paymentDate = new Date(data.paymentDate)
        if (data.reference) updateData.reference = data.reference
        if (notes) updateData.notes = notes
    }

    const updated = await (prisma as any).payrollPayment.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true
          }
        }
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating payment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Eliminar pago pendiente
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const payment = await (prisma as any).payrollPayment.findUnique({
      where: { id },
      include: { employee: true }
    })

    if (!payment || payment.employee.userId !== session.user.id) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Solo se pueden eliminar pagos pendientes' }, { status: 400 })
    }

    await (prisma as any).payrollPayment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting payment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
