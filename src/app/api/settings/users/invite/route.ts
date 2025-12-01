import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

/**
 * POST /api/settings/users/invite - Invite a new user to the company
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { companyId, email, name, role, department, title } = await req.json()

    if (!companyId || !email || !name) {
      return NextResponse.json(
        { error: 'Company ID, email, and name are required' },
        { status: 400 }
      )
    }

    // Verify the company exists and user has access
    const companyUser = await prisma.companyUser.findFirst({
      where: {
        companyId,
        userId: session.user.id,
        isActive: true
      },
      include: {
        company: true
      }
    })

    if (!companyUser) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 403 }
      )
    }

    const company = companyUser.company

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    // Get or create a default role for the company
    let companyRole = await prisma.companyRole.findFirst({
      where: {
        companyId,
        name: role || 'Viewer'
      }
    })

    if (!companyRole) {
      // Create default role
      companyRole = await prisma.companyRole.create({
        data: {
          companyId,
          name: role || 'Viewer',
          description: `${role || 'Viewer'} role`,
          permissions: { read: true, write: role !== 'Viewer' },
          isSystem: false
        }
      })
    }

    if (existingUser) {
      // Check if already part of this company
      const existingMembership = await prisma.companyUser.findFirst({
        where: {
          companyId,
          userId: existingUser.id
        }
      })

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a member of this company' },
          { status: 400 }
        )
      }

      // Add existing user to company
      await prisma.companyUser.create({
        data: {
          companyId,
          userId: existingUser.id,
          roleId: companyRole.id,
          isOwner: false,
          invitedBy: session.user.id,
          invitedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: `${existingUser.name} has been added to ${company.name}`,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          status: 'Active'
        }
      })
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create invitation
    const invitation = await prisma.companyInvitation.create({
      data: {
        companyId,
        email,
        roleId: companyRole.id,
        invitedBy: session.user.id,
        token,
        status: 'PENDING',
        expiresAt
      }
    })

    // Log invitation details
    console.log(`[Invite] Invitation created for ${email}`)
    console.log(`[Invite] Token: ${token}`)
    console.log(`[Invite] Company: ${company.name}, Role: ${role}`)

    // For development, return the invite link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const inviteLink = `${baseUrl}/auth/accept-invite?token=${token}`

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      invitation: {
        id: invitation.id,
        email,
        status: 'Pending',
        expiresAt
      },
      // Only include in development for testing
      ...(process.env.NODE_ENV === 'development' && { 
        inviteLink,
        note: 'In production, an email would be sent to the user with this link.'
      })
    })

  } catch (error: any) {
    console.error('[Invite] Error:', error)
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An invitation for this email already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to send invitation' },
      { status: 500 }
    )
  }
}
