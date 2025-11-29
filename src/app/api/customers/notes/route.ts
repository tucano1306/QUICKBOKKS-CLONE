'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface CustomerNote {
  id: string
  customerId: string
  customerName?: string
  title: string
  content: string
  category: 'general' | 'payment' | 'support' | 'sales' | 'complaint' | 'meeting'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  isPinned: boolean
  createdBy: string
  createdDate: string
  lastModified: string
  tags: string[]
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
    const allNotes: CustomerNote[] = []
    
    customers.forEach(customer => {
      if (customer.notes) {
        try {
          // Try parsing as JSON array
          const parsedNotes = JSON.parse(customer.notes)
          if (Array.isArray(parsedNotes)) {
            parsedNotes.forEach((note: Partial<CustomerNote>) => {
              allNotes.push({
                id: note.id || `note-${customer.id}-${Date.now()}`,
                customerId: customer.id,
                customerName: customer.name,
                title: note.title || 'Nota sin título',
                content: note.content || '',
                category: note.category || 'general',
                priority: note.priority || 'medium',
                isPinned: note.isPinned || false,
                createdBy: note.createdBy || 'Sistema',
                createdDate: note.createdDate || customer.updatedAt.toISOString(),
                lastModified: note.lastModified || customer.updatedAt.toISOString(),
                tags: note.tags || []
              })
            })
          } else {
            // Simple text note - convert to new format
            allNotes.push({
              id: `note-${customer.id}`,
              customerId: customer.id,
              customerName: customer.name,
              title: 'Nota',
              content: customer.notes,
              category: 'general',
              priority: 'medium',
              isPinned: false,
              createdBy: 'Sistema',
              createdDate: customer.updatedAt.toISOString(),
              lastModified: customer.updatedAt.toISOString(),
              tags: []
            })
          }
        } catch {
          // Plain text note - convert to new format
          allNotes.push({
            id: `note-${customer.id}`,
            customerId: customer.id,
            customerName: customer.name,
            title: 'Nota',
            content: customer.notes,
            category: 'general',
            priority: 'medium',
            isPinned: false,
            createdBy: 'Sistema',
            createdDate: customer.updatedAt.toISOString(),
            lastModified: customer.updatedAt.toISOString(),
            tags: []
          })
        }
      }
    })

    // Sort by pinned first, then by date descending
    allNotes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    })

    return NextResponse.json({ 
      notes: allNotes,
      summary: {
        total: allNotes.length,
        customers: customers.length,
        pinned: allNotes.filter(n => n.isPinned).length,
        urgent: allNotes.filter(n => n.priority === 'urgent').length
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
    const { customerId, title, content, category, priority, isPinned, tags } = body

    if (!customerId || !title || !content) {
      return NextResponse.json({ error: 'Customer ID, title and content required' }, { status: 400 })
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
          customerId: customer.id,
          title: 'Nota anterior',
          content: customer.notes,
          category: 'general',
          priority: 'medium',
          isPinned: false,
          createdBy: 'Sistema',
          createdDate: customer.updatedAt.toISOString(),
          lastModified: customer.updatedAt.toISOString(),
          tags: []
        }]
      }
    }

    // Add new note
    const now = new Date().toISOString()
    const newNote: CustomerNote = {
      id: `note-${Date.now()}`,
      customerId,
      title,
      content,
      category: category || 'general',
      priority: priority || 'medium',
      isPinned: isPinned || false,
      createdBy: session.user?.name || session.user?.email || 'Usuario',
      createdDate: now,
      lastModified: now,
      tags: tags || []
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
