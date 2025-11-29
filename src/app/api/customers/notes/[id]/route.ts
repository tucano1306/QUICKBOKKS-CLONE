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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: noteId } = await params
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Search for the note in all customers
    const customers = await prisma.customer.findMany({
      where: { companyId, notes: { not: null } },
      select: { id: true, name: true, notes: true }
    })

    for (const customer of customers) {
      if (customer.notes) {
        try {
          const parsedNotes = JSON.parse(customer.notes)
          if (Array.isArray(parsedNotes)) {
            const note = parsedNotes.find((n: CustomerNote) => n.id === noteId)
            if (note) {
              return NextResponse.json({
                note: {
                  ...note,
                  customerId: customer.id,
                  customerName: customer.name
                }
              })
            }
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    return NextResponse.json({ error: 'Note not found' }, { status: 404 })

  } catch (error) {
    console.error('Error fetching note:', error)
    return NextResponse.json({ error: 'Error fetching note' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: noteId } = await params
    const body = await request.json()
    const { customerId, title, content, category, priority, isPinned, tags, companyId } = body

    if (!customerId || !companyId) {
      return NextResponse.json({ error: 'Customer ID and Company ID required' }, { status: 400 })
    }

    // Get current customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Parse existing notes
    let existingNotes: CustomerNote[] = []
    if (customer.notes) {
      try {
        const parsed = JSON.parse(customer.notes)
        if (Array.isArray(parsed)) {
          existingNotes = parsed
        }
      } catch {
        return NextResponse.json({ error: 'Error parsing notes' }, { status: 500 })
      }
    }

    // Find and update the note
    const noteIndex = existingNotes.findIndex(n => n.id === noteId)
    if (noteIndex === -1) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const updatedNote: CustomerNote = {
      ...existingNotes[noteIndex],
      title: title || existingNotes[noteIndex].title,
      content: content || existingNotes[noteIndex].content,
      category: category || existingNotes[noteIndex].category,
      priority: priority || existingNotes[noteIndex].priority,
      isPinned: isPinned !== undefined ? isPinned : existingNotes[noteIndex].isPinned,
      tags: tags || existingNotes[noteIndex].tags,
      lastModified: new Date().toISOString()
    }

    existingNotes[noteIndex] = updatedNote

    // Update customer
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        notes: JSON.stringify(existingNotes)
      }
    })

    return NextResponse.json({ note: updatedNote })

  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: 'Error updating note' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: noteId } = await params
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Search for the note in all customers and delete it
    const customers = await prisma.customer.findMany({
      where: { companyId, notes: { not: null } },
      select: { id: true, notes: true }
    })

    for (const customer of customers) {
      if (customer.notes) {
        try {
          const parsedNotes = JSON.parse(customer.notes) as CustomerNote[]
          if (Array.isArray(parsedNotes)) {
            const noteIndex = parsedNotes.findIndex(n => n.id === noteId)
            if (noteIndex !== -1) {
              // Remove the note
              parsedNotes.splice(noteIndex, 1)
              
              // Update customer
              await prisma.customer.update({
                where: { id: customer.id },
                data: {
                  notes: parsedNotes.length > 0 ? JSON.stringify(parsedNotes) : null
                }
              })

              return NextResponse.json({ success: true })
            }
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    return NextResponse.json({ error: 'Note not found' }, { status: 404 })

  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Error deleting note' }, { status: 500 })
  }
}
