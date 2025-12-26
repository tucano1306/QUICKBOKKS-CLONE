import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { sanitizeString } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, company } = body

    // Validación básica
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: 'El nombre debe tener al menos 2 caracteres' },
        { status: 400 }
      )
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user with sanitized data
    const user = await prisma.user.create({
      data: {
        name: sanitizeString(name),
        email: email.toLowerCase(),
        password: hashedPassword,
        company: company ? sanitizeString(company) : null,
        role: 'USER',
      }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Error al crear el usuario' },
      { status: 500 }
    )
  }
}
