'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface CustomerNote {
  id: string
  date: string
  content: string
  type: string
  createdBy: string
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const customerId = searchParams.get('customerId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Build where clause
    const whereClause: Record<string, unknown> = { 
      companyId,
      notes: { not: null }
    }
    if (customerId) {
      whereClause.id = customerId
    }

    // Get customers with notes
    const customers = await prisma.customer.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        notes: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Parse notes - notes field contains JSON array of notes
    const allNotes: Array<CustomerNote & { customerName: string; customerId: string }> = []
    
    customers.forEach(customer => {
      if (customer.notes) {
        try {
          // Try parsing as JSON array
          const parsedNotes = JSON.parse(customer.notes)
          if (Array.isArray(parsedNotes)) {
            parsedNotes.forEach((note: CustomerNote) => {
              allNotes.push({
                ...note,
                customerName: customer.name,
                customerId: customer.id
              })
            })
          } else {
            // Simple text note
            allNotes.push({
              id: `note-${customer.id}`,
              date: customer.updatedAt.toISOString().split('T')[0],
              content: customer.notes,
              type: 'general',
              createdBy: 'Sistema',
              customerName: customer.name,
              customerId: customer.id
            })
          }
        } catch {
          // Plain text note
          allNotes.push({
            id: `note-${customer.id}`,
            date: customer.updatedAt.toISOString().split('T')[0],
            content: customer.notes,
            type: 'general',
            createdBy: 'Sistema',
            customerName: customer.name,
            customerId: customer.id
          })
        }
      }
    })

    // Sort by date descending
    allNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({ 
      notes: allNotes,
      summary: {
        total: allNotes.length,
        customers: customers.length
      }
    })

  } catch (error) {
    console.error('Error fetching customer notes:', error)
    return NextResponse.json({ error: 'Error fetching notes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { customerId, content, type } = body

    if (!customerId || !content) {
      return NextResponse.json({ error: 'Customer ID and content required' }, { status: 400 })
    }

    // Get current customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Parse existing notes or create new array
    let existingNotes: CustomerNote[] = []
    if (customer.notes) {
      try {
        const parsed = JSON.parse(customer.notes)
        if (Array.isArray(parsed)) {
          existingNotes = parsed
        }
      } catch {
        // Convert old plain text note to array format
        existingNotes = [{
          id: `note-old-${Date.now()}`,
          date: customer.updatedAt.toISOString().split('T')[0],
          content: customer.notes,
          type: 'general',
          createdBy: 'Sistema'
        }]
      }
    }

    // Add new note
    const newNote: CustomerNote = {
      id: `note-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      content,
      type: type || 'general',
      createdBy: session.user?.name || session.user?.email || 'Usuario'
    }

    existingNotes.unshift(newNote)

    // Update customer
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        notes: JSON.stringify(existingNotes)
      }
    })

    return NextResponse.json({ note: newNote }, { status: 201 })

  } catch (error) {
    console.error('Error creating customer note:', error)
    return NextResponse.json({ error: 'Error creating note' }, { status: 500 })
  }
}
