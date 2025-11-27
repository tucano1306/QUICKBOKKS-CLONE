import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { customerId } = await req.json()

    if (!customerId) {
      return NextResponse.json({ error: 'customerId es requerido' }, { status: 400 })
    }

    // Buscar el cliente
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    if (!customer.email) {
      return NextResponse.json({ error: 'Cliente no tiene email' }, { status: 400 })
    }

    // Generar contraseña temporal (en producción usar bcrypt)
    const temporaryPassword = Math.random().toString(36).slice(-8)

    // Activar portal y guardar contraseña
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        portalActive: true,
        portalPassword: temporaryPassword // En producción: await bcrypt.hash(temporaryPassword, 10)
      }
    })

    // Aquí enviarías un email real con el servicio de email
    // Por ahora solo simulamos
    console.log(`Invitación enviada a ${customer.email}`)
    console.log(`Contraseña temporal: ${temporaryPassword}`)
    console.log(`Link de acceso: ${process.env.NEXTAUTH_URL}/portal/login`)

    // En producción:
    // await sendEmail({
    //   to: customer.email,
    //   subject: 'Invitación al Portal de Cliente',
    //   html: `
    //     <h1>Bienvenido al Portal</h1>
    //     <p>Has sido invitado a acceder al portal de clientes.</p>
    //     <p>Usuario: ${customer.email}</p>
    //     <p>Contraseña temporal: ${temporaryPassword}</p>
    //     <a href="${process.env.NEXTAUTH_URL}/portal/login">Acceder al Portal</a>
    //   `
    // })

    return NextResponse.json({ 
      message: 'Invitación enviada exitosamente',
      email: customer.email
    })
  } catch (error) {
    console.error('Error inviting to portal:', error)
    return NextResponse.json(
      { error: 'Error al enviar invitación' },
      { status: 500 }
    )
  }
}
