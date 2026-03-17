/**
 * API para revisión de documentos procesados por IA
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function mapStatus(dbStatus: string, isReclassified: boolean): 'pending_review' | 'approved' | 'reclassified' | 'rejected' {
  if (isReclassified && dbStatus !== 'APPROVED' && dbStatus !== 'REJECTED') return 'reclassified'
  switch (dbStatus) {
    case 'APPROVED': return 'approved'
    case 'REJECTED': return 'rejected'
    default: return 'pending_review'
  }
}

function mapConfidence(score: number | null): 'high' | 'medium' | 'low' {
  if (!score) return 'low'
  if (score >= 80) return 'high'
  if (score >= 60) return 'medium'
  return 'low'
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    const rows = await prisma.uploadedDocument.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        suggestedAccount: { select: { id: true, code: true, name: true } }
      }
    })

    const documents = rows.map(doc => {
      const extracted = (doc.extractedData as Record<string, unknown> | null) ?? {}
      const ai = (doc.aiAnalysis as Record<string, unknown> | null) ?? {}
      const meta = (doc.metadata as Record<string, unknown> | null) ?? {}
      const isReclassified = meta.reclassified === true
      const amount = doc.amount ?? (extracted.amount as number | undefined) ?? 0
      const vendor = (extracted.vendor as string | undefined) ?? (extracted.supplierName as string | undefined) ?? 'Sin proveedor'
      const docDate = doc.documentDate
        ? doc.documentDate.toISOString().split('T')[0]
        : doc.createdAt.toISOString().split('T')[0]

      const suggestedAccountCode = doc.suggestedAccount?.code ?? (extracted.accountCode as string | undefined) ?? '6000'
      const suggestedAccountName = doc.suggestedAccount?.name ?? (extracted.accountName as string | undefined) ?? 'Gastos Generales'

      // Build journal entry from aiAnalysis or defaults
      const aiJournal = ai.journalEntry as { debit?: { account?: string; amount?: number }; credit?: { account?: string; amount?: number } } | undefined
      const journalEntry = {
        debit: {
          account: aiJournal?.debit?.account ?? `${suggestedAccountCode} - ${suggestedAccountName}`,
          amount: aiJournal?.debit?.amount ?? amount
        },
        credit: {
          account: aiJournal?.credit?.account ?? '2000 - Cuentas por Pagar',
          amount: aiJournal?.credit?.amount ?? amount
        }
      }

      return {
        id: doc.id,
        filename: doc.filename,
        uploadDate: doc.createdAt.toISOString().split('T')[0],
        aiCategory: doc.suggestedCategory ?? doc.documentType,
        aiConfidence: doc.aiConfidence ?? 85,
        amount,
        vendor,
        date: docDate,
        invoiceNumber: doc.invoiceNumber ?? undefined,
        taxId: (extracted.taxId as string | undefined) ?? undefined,
        description: doc.description ?? doc.filename,
        suggestedAccount: suggestedAccountName,
        suggestedAccountCode,
        reclassified: isReclassified,
        finalAccount: isReclassified ? (meta.finalAccount as string | undefined) : undefined,
        finalAccountCode: isReclassified ? (meta.finalAccountCode as string | undefined) : undefined,
        journalEntry,
        status: mapStatus(doc.status, isReclassified),
        confidence: mapConfidence(doc.aiConfidence)
      }
    })

    return NextResponse.json({ documents, total: documents.length })

  } catch (error) {
    console.error('Error in document review API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents', documents: [] },
      { status: 500 }
    )
  }
}
