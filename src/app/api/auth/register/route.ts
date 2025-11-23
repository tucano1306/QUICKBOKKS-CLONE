import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { validateUserRegistrationRequest, createErrorResponse } from '@/lib/validation-middleware'
import { validateUserRegistration, sanitizeString } from '@/lib/validation'

export async function POST(req: NextRequest) {
  try {
    // Validate request data
    const { data: body, error: validationError } = await validateUserRegistrationRequest(req)
    if (validationError) return validationError

    const { name, email, password, company } = body

    // Additional validation
    const validation = validateUserRegistration({
      name,
      email,
      password,
      confirmPassword: password, // In real app, this should come from body
    })

    if (!validation.isValid) {
      return createErrorResponse(validation.errors.join('; '), 400)
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
