import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List attachments for a transaction
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const transactionType = searchParams.get('transactionType')
    const transactionId = searchParams.get('transactionId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    const where: any = { companyId }
    if (transactionType) where.transactionType = transactionType
    if (transactionId) where.transactionId = transactionId

    const attachments = await prisma.transactionAttachment.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(attachments)
  } catch (error) {
    console.error('Error fetching attachments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add attachment to transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId, transactionType, transactionId, fileName, fileType, fileSize, fileUrl, thumbnailUrl, description } = body

    if (!companyId || !transactionType || !transactionId || !fileName || !fileUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const attachment = await prisma.transactionAttachment.create({
      data: {
        companyId,
        transactionType,
        transactionId,
        fileName,
        fileType: fileType || 'application/octet-stream',
        fileSize: fileSize || 0,
        fileUrl,
        thumbnailUrl: thumbnailUrl || null,
        uploadedBy: session.user.id,
        description: description || null
      }
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    console.error('Error creating attachment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove attachment
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 })
    }

    await prisma.transactionAttachment.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting attachment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
