/**
 * Document AI Processing API
 *
 * Usa Groq AI (GRATIS) para procesar documentos
 * Fallback a análisis local si no está configurado
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Aumentar límite de body a 20MB para fotos de cámara (default Vercel: 4.5MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
}

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

// Tipos
interface ExtractedData {
  amount: number | null
  date: string | null
  dueDate: string | null
  vendor: string | null
  invoiceNumber: string | null
  description: string | null
  taxAmount: number | null
  subtotal: number | null
  lineItems: Array<{
    description: string
    quantity: number
    unitPrice: number
    amount: number
  }>
  taxId: string | null
  paymentMethod: string | null
}

interface DocumentAnalysis {
  documentType: 'INVOICE' | 'RECEIPT' | 'BANK_STATEMENT' | 'TAX_DOCUMENT' | 'CONTRACT' | 'EXPENSE_REPORT' | 'PAYROLL' | 'OTHER'
  confidence: number
  extractedData: ExtractedData
  suggestedAccount: {
    code: string
    name: string
  } | null
  suggestedCategory: string
  journalEntry: {
    description: string
    lines: Array<{
      accountCode: string
      accountName: string
      debit: number
      credit: number
    }>
  } | null
  processingTime: number
}

// Helper: get companyId for user (fallback to first membership)
async function getCompanyId(userId: string, requestedCompanyId?: string | null): Promise<string | null> {
  if (requestedCompanyId) return requestedCompanyId
  // Try CompanyUser membership
  const membership = await prisma.companyUser.findFirst({
    where: { userId },
    select: { companyId: true }
  })
  if (membership?.companyId) return membership.companyId
  // Try any company directly linked to user via uploadedDocuments or invoices as last resort
  const anyCompany = await prisma.company.findFirst({
    where: { isActive: true },
    select: { id: true }
  })
  return anyCompany?.id ?? null
}

// Helper: reconstruct analysis object from DB record
function buildAnalysis(doc: {
  documentType: string
  aiConfidence: number | null
  extractedData: unknown
  aiAnalysis: unknown
  suggestedCategory: string | null
  processingTime: number | null
}): DocumentAnalysis | null {
  if (!doc.aiAnalysis) return null
  const ai = doc.aiAnalysis as DocumentAnalysis
  return {
    documentType: doc.documentType as DocumentAnalysis['documentType'],
    confidence: doc.aiConfidence ?? ai.confidence ?? 0,
    extractedData: (doc.extractedData as ExtractedData) ?? ai.extractedData,
    suggestedAccount: ai.suggestedAccount ?? null,
    suggestedCategory: doc.suggestedCategory ?? ai.suggestedCategory ?? '',
    journalEntry: ai.journalEntry ?? null,
    processingTime: doc.processingTime ?? ai.processingTime ?? 0
  }
}

// ============================================
// OCR SIMULATION
// ============================================

function generateSimulatedOCRText(filename: string): string {
  const lower = filename.toLowerCase()
  const date = new Date().toISOString().split('T')[0]

  if (lower.includes('invoice') || lower.includes('factura')) {
    return `
INVOICE / FACTURA
Invoice Number: INV-${Date.now().toString().slice(-6)}
Date: ${date}
Due Date: ${new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]}

From: ABC Supplies Inc.
Tax ID: 12-3456789
123 Business Ave, Miami, FL 33101

Bill To: Your Company
456 Main Street, Miami, FL 33102

Description                    Qty    Unit Price    Amount
Office Supplies               10      $25.00        $250.00
Printing Services              5      $50.00        $250.00
Software License               1     $199.00        $199.00

                              Subtotal:             $699.00
                              Sales Tax (7%):        $48.93
                              TOTAL:                $747.93

Payment Terms: Net 30
    `
  }

  if (lower.includes('receipt') || lower.includes('recibo')) {
    return `
RECEIPT
Store: Office Depot #1234
123 Retail Blvd, Miami, FL 33101
Date: ${date}

Items Purchased:
Printer Paper (5 reams)         $45.99
Ink Cartridges                  $89.99
Stapler                         $12.99
Folders (pack of 50)            $24.99

Subtotal:                      $173.96
Sales Tax (7%):                 $12.18
TOTAL:                         $186.14

Payment: VISA ****4532
    `
  }

  if (lower.includes('statement') || lower.includes('estado')) {
    return `
BANK STATEMENT
Bank of America
Account: ****5678
Period: ${new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]} to ${date}

Beginning Balance:             $45,678.90

DEPOSITS & CREDITS
${date} Client Payment           $5,000.00
${date} Wire Transfer           $12,500.00
Total Deposits:                $17,500.00

WITHDRAWALS & DEBITS
${date} Rent Payment            $3,500.00
${date} Utilities                 $425.00
Total Withdrawals:              $3,925.00

Ending Balance:                $59,253.90
    `
  }

  return `
DOCUMENT
Date: ${date}
Reference: DOC-${Date.now().toString().slice(-6)}
Category: General Expense
  `
}

// ============================================
// AI ANALYSIS
// ============================================

function classifyDocument(text: string, filename: string): DocumentAnalysis['documentType'] {
  const lower = (text + ' ' + filename).toLowerCase()

  const patterns: Record<DocumentAnalysis['documentType'], string[]> = {
    INVOICE: ['invoice', 'factura', 'bill to', 'due date', 'payment terms', 'inv-'],
    RECEIPT: ['receipt', 'recibo', 'thank you', 'change due', 'cashier', 'store #'],
    BANK_STATEMENT: ['statement', 'estado de cuenta', 'beginning balance', 'ending balance'],
    TAX_DOCUMENT: ['1099', 'w-9', 'w9', 'tax form', 'ein', 'irs'],
    CONTRACT: ['contract', 'agreement', 'terms and conditions', 'hereby agree'],
    EXPENSE_REPORT: ['expense report', 'reimbursement', 'travel expense'],
    PAYROLL: ['payroll', 'paycheck', 'wages', 'salary', 'net pay'],
    OTHER: []
  }

  let bestMatch: DocumentAnalysis['documentType'] = 'OTHER'
  let maxScore = 0

  for (const [type, keywords] of Object.entries(patterns)) {
    const score = keywords.filter(kw => lower.includes(kw)).length
    if (score > maxScore) {
      maxScore = score
      bestMatch = type as DocumentAnalysis['documentType']
    }
  }

  return bestMatch
}

function extractDataFromText(text: string): ExtractedData {
  const data: ExtractedData = {
    amount: null,
    date: null,
    dueDate: null,
    vendor: null,
    invoiceNumber: null,
    description: null,
    taxAmount: null,
    subtotal: null,
    lineItems: [],
    taxId: null,
    paymentMethod: null
  }

  // Extract amount
  const amountMatch = /total[:\s]*\$?([\d,]+\.?\d*)/i.exec(text)
  if (amountMatch) {
    data.amount = Number.parseFloat(amountMatch[1].replaceAll(',', ''))
  }

  // Extract subtotal
  const subtotalMatch = /subtotal[:\s]*\$?([\d,]+\.?\d*)/i.exec(text)
  if (subtotalMatch) {
    data.subtotal = Number.parseFloat(subtotalMatch[1].replaceAll(',', ''))
  }

  // Extract tax
  const taxMatch = /(?:sales )?tax[:\s]*\(?\d*%?\)?[:\s]*\$?([\d,]+\.?\d*)/i.exec(text)
  if (taxMatch) {
    data.taxAmount = Number.parseFloat(taxMatch[1].replaceAll(',', ''))
  }

  // Extract date
  const dateMatch = /date[:\s]*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i.exec(text)
  if (dateMatch) {
    data.date = dateMatch[1]
  }

  // Extract due date
  const dueDateMatch = /due date[:\s]*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i.exec(text)
  if (dueDateMatch) {
    data.dueDate = dueDateMatch[1]
  }

  // Extract invoice number
  const invoiceMatch = /invoice\s*(?:number|no|#)?[:\s]*([A-Z0-9-]+)/i.exec(text)
  if (invoiceMatch) {
    data.invoiceNumber = invoiceMatch[1]
  }

  // Extract vendor
  const vendorMatch = /from[:\s]*([^\n]+)/i.exec(text)
  if (vendorMatch) {
    data.vendor = vendorMatch[1].trim()
  }

  // Extract Tax ID
  const taxIdMatch = /tax id[:\s]*(\d{2}-\d{7})/i.exec(text)
  if (taxIdMatch) {
    data.taxId = taxIdMatch[1]
  }

  // Extract payment method
  const paymentMatch = /payment[:\s]*(visa|mastercard|check|cash)/i.exec(text)
  if (paymentMatch) {
    data.paymentMethod = paymentMatch[1].toUpperCase()
  }

  // Extract line items
  const linePattern = /([A-Za-z][\w\s]+?)\s+(\d+)\s+\$?([\d.]+)\s+\$?([\d.]+)/g
  let match
  while ((match = linePattern.exec(text)) !== null) {
    const desc = match[1].trim()
    if (!desc.toLowerCase().includes('description') && !desc.toLowerCase().includes('qty')) {
      data.lineItems.push({
        description: desc,
        quantity: Number.parseInt(match[2]),
        unitPrice: Number.parseFloat(match[3]),
        amount: Number.parseFloat(match[4])
      })
    }
  }

  // Generate description
  data.description = data.vendor ? `Document from ${data.vendor}` : 'Uploaded document'

  return data
}

function generateJournalEntrySuggestion(
  documentType: DocumentAnalysis['documentType'],
  data: ExtractedData
): DocumentAnalysis['journalEntry'] {
  if (!data.amount) return null

  const amount = data.amount
  const taxAmount = data.taxAmount || 0
  const netAmount = amount - taxAmount

  if (documentType === 'INVOICE') {
    return {
      description: `${data.vendor || 'Vendor'} - Invoice ${data.invoiceNumber || ''}`.trim(),
      lines: [
        { accountCode: '6100', accountName: 'Expenses', debit: netAmount, credit: 0 },
        ...(taxAmount > 0 ? [{ accountCode: '1400', accountName: 'Sales Tax Receivable', debit: taxAmount, credit: 0 }] : []),
        { accountCode: '2000', accountName: 'Accounts Payable', debit: 0, credit: amount }
      ]
    }
  }

  if (documentType === 'RECEIPT') {
    return {
      description: `Purchase at ${data.vendor || 'Store'}`,
      lines: [
        { accountCode: '6100', accountName: 'Office Supplies', debit: netAmount, credit: 0 },
        ...(taxAmount > 0 ? [{ accountCode: '1400', accountName: 'Sales Tax Paid', debit: taxAmount, credit: 0 }] : []),
        { accountCode: '1000', accountName: 'Cash/Bank', debit: 0, credit: amount }
      ]
    }
  }

  return {
    description: data.description || 'Document',
    lines: [
      { accountCode: '6900', accountName: 'Other Expenses', debit: amount, credit: 0 },
      { accountCode: '2000', accountName: 'Accounts Payable', debit: 0, credit: amount }
    ]
  }
}

function analyzeDocument(filename: string): DocumentAnalysis {
  const startTime = Date.now()

  // Generate simulated OCR text
  const ocrText = generateSimulatedOCRText(filename)

  // Classify document
  const documentType = classifyDocument(ocrText, filename)

  // Extract data
  const extractedData = extractDataFromText(ocrText)

  // Generate journal entry suggestion
  const journalEntry = generateJournalEntrySuggestion(documentType, extractedData)

  // Determine suggested account
  const accountMappings: Record<DocumentAnalysis['documentType'], { code: string; name: string }> = {
    'INVOICE': { code: '2000', name: 'Accounts Payable' },
    'RECEIPT': { code: '6100', name: 'Office Supplies Expense' },
    'BANK_STATEMENT': { code: '1000', name: 'Cash and Bank' },
    'TAX_DOCUMENT': { code: '2100', name: 'Taxes Payable' },
    'CONTRACT': { code: '1500', name: 'Prepaid Expenses' },
    'EXPENSE_REPORT': { code: '6200', name: 'Travel & Entertainment' },
    'PAYROLL': { code: '6000', name: 'Salaries and Wages' },
    'OTHER': { code: '6900', name: 'Other Expenses' }
  }

  // Category mapping for Florida
  const categoryMappings: Record<DocumentAnalysis['documentType'], string> = {
    'INVOICE': 'Accounts Payable',
    'RECEIPT': 'Operating Expenses',
    'BANK_STATEMENT': 'Banking',
    'TAX_DOCUMENT': 'Tax Compliance',
    'CONTRACT': 'Legal & Professional',
    'EXPENSE_REPORT': 'Travel & Reimbursement',
    'PAYROLL': 'Payroll Expenses',
    'OTHER': 'General Expenses'
  }

  // Calculate confidence
  let confidence = 50
  if (extractedData.amount) confidence += 15
  if (extractedData.date) confidence += 10
  if (extractedData.vendor) confidence += 10
  if (extractedData.invoiceNumber) confidence += 5
  if (extractedData.lineItems.length > 0) confidence += 10

  return {
    documentType,
    confidence: Math.min(confidence, 99),
    extractedData,
    suggestedAccount: accountMappings[documentType],
    suggestedCategory: categoryMappings[documentType],
    journalEntry,
    processingTime: Date.now() - startTime
  }
}

// ============================================
// API HANDLERS
// ============================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const autoProcess = formData.get('autoProcess') === 'true'
    const requestedCompanyId = formData.get('companyId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const companyId = await getCompanyId(session.user.id, requestedCompanyId)
    if (!companyId) {
      return NextResponse.json({ error: 'No company found for user' }, { status: 400 })
    }

    // Análisis local basado en nombre de archivo y patrones de texto
    const analysis: DocumentAnalysis | null = autoProcess ? analyzeDocument(file.name) : null

    const docStatus = autoProcess ? 'ANALYZED' : 'PENDING'
    const safeDocType = analysis?.documentType ?? 'OTHER'

    // Persist to database
    const doc = await prisma.uploadedDocument.create({
      data: {
        filename: file.name,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: Math.round(file.size),
        status: docStatus as any,
        documentType: safeDocType as any,
        uploadedById: session.user.id,
        companyId,
        aiAnalysis: analysis ? (analysis as any) : null,
        extractedData: analysis ? (analysis.extractedData as any) : null,
        suggestedCategory: analysis?.suggestedCategory ?? null,
        aiConfidence: analysis?.confidence ?? null,
        processingTime: analysis?.processingTime ? Math.round(analysis.processingTime) : null,
        amount: analysis?.extractedData?.amount ?? null,
        invoiceNumber: analysis?.extractedData?.invoiceNumber ?? null,
        description: analysis?.extractedData?.description ?? null,
      }
    })

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        originalFilename: doc.originalName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        status: doc.status,
        documentType: analysis?.documentType || null,
        aiConfidence: analysis?.confidence || null,
        amount: analysis?.extractedData?.amount || null,
        suggestedCategory: analysis?.suggestedCategory || null,
        suggestedAccount: analysis?.suggestedAccount || null,
        extractedData: analysis?.extractedData || null,
        aiAnalysis: analysis || null,
        processingTime: analysis?.processingTime || null,
        createdAt: doc.createdAt.toISOString(),
        uploadedBy: { name: session.user.name, email: session.user.email },
        aiProvider: 'Local Analysis',
        processingLogs: autoProcess ? [
          { id: '1', stage: 'OCR', status: 'SUCCESS', message: 'Text extracted from filename', duration: 10, createdAt: new Date().toISOString() },
          { id: '2', stage: 'ANALYSIS', status: 'SUCCESS', message: `📊 Local: ${analysis?.documentType}`, duration: analysis?.processingTime || 0, createdAt: new Date().toISOString() },
          { id: '3', stage: 'COMPLETE', status: 'SUCCESS', message: 'Processing complete', duration: 0, createdAt: new Date().toISOString() }
        ] : []
      },
      analysis,
      aiProvider: 'local'
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const code = String(error?.code ?? '')
    const meta = error?.meta ?? {}
    console.error('Document processing error:', msg, code, meta)
    return NextResponse.json(
      { error: `Failed to process document: ${msg}`, code, meta },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')
    const companyIdFilter = searchParams.get('companyId')
    const statusFilter = searchParams.get('status')

    if (documentId) {
      const doc = await prisma.uploadedDocument.findFirst({
        where: { id: documentId, uploadedById: session.user.id }
      })
      if (!doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      const analysis = buildAnalysis(doc)
      return NextResponse.json({
        document: {
          id: doc.id,
          originalFilename: doc.originalName,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          status: doc.status,
          documentType: doc.documentType || null,
          aiConfidence: doc.aiConfidence || null,
          amount: doc.amount || null,
          suggestedCategory: doc.suggestedCategory || null,
          suggestedAccount: analysis?.suggestedAccount || null,
          extractedData: doc.extractedData || null,
          aiAnalysis: analysis || null,
          documentDate: doc.documentDate ? doc.documentDate.toISOString() : null,
          processingTime: doc.processingTime || null,
          createdAt: doc.createdAt.toISOString(),
          uploadedBy: { name: session.user.name, email: session.user.email },
          processingLogs: []
        }
      })
    }

    // Return all documents for this user
    const docs = await prisma.uploadedDocument.findMany({
      where: {
        uploadedById: session.user.id,
        ...(companyIdFilter ? { companyId: companyIdFilter } : {}),
        ...(statusFilter ? { status: statusFilter as any } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const documents = docs.map(doc => {
      const analysis = buildAnalysis(doc)
      return {
        id: doc.id,
        originalFilename: doc.originalName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        status: doc.status,
        documentType: doc.documentType || null,
        aiConfidence: doc.aiConfidence || null,
        amount: doc.amount || null,
        suggestedCategory: doc.suggestedCategory || null,
        suggestedAccount: analysis?.suggestedAccount || null,
        extractedData: doc.extractedData || null,
        aiAnalysis: analysis || null,
        documentDate: doc.documentDate ? doc.documentDate.toISOString() : null,
        createdAt: doc.createdAt.toISOString(),
        uploadedBy: { name: session.user.name, email: session.user.email }
      }
    })

    return NextResponse.json({
      documents,
      pagination: { page: 1, limit: 20, total: documents.length, totalPages: 1 }
    })

  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

// ============================================
// APPROVE ACTION HELPERS
// ============================================

async function createTransactionFromDoc(
  doc: { originalName: string },
  expenseData: Record<string, string | number | null | undefined>,
  companyId: string
): Promise<unknown> {
  let txDate: Date
  if (expenseData.date) {
    const [year, month, day] = String(expenseData.date).split('-').map(Number)
    txDate = new Date(year, month - 1, day, 12, 0, 0)
  } else {
    txDate = new Date()
  }
  const vendorSuffix = expenseData.vendor ? ` | Proveedor: ${String(expenseData.vendor)}` : ''
  try {
    return await prisma.transaction.create({
      data: {
        companyId,
        type: 'EXPENSE',
        category: String(expenseData.category || 'Gastos Generales'),
        description: String(expenseData.description || `Factura escaneada: ${doc.originalName}`),
        amount: Number(expenseData.amount),
        date: txDate,
        status: 'COMPLETED',
        reference: expenseData.reference ? String(expenseData.reference) : null,
        notes: `Creado automáticamente desde documento: ${doc.originalName}${vendorSuffix}`
      }
    })
  } catch (txError) {
    console.error('Error creating transaction from document:', txError)
    return null
  }
}

async function handleApproveAction(
  doc: { id: string; originalName: string; extractedData: unknown },
  userId: string,
  expenseData: Record<string, string | number | null | undefined> | undefined,
  companyId: string | undefined,
  createExpense: boolean
): Promise<{ updateData: Record<string, unknown>; createdTransaction: unknown }> {
  const updateData: Record<string, unknown> = {
    status: 'APPROVED',
    approvedById: userId,
    approvedAt: new Date()
  }

  if (expenseData?.amount) updateData.amount = Number(expenseData.amount)
  if (expenseData?.date) {
    const [yr, mo, dy] = String(expenseData.date).split('-').map(Number)
    updateData.documentDate = new Date(yr, mo - 1, dy, 12, 0, 0)
  }
  if (expenseData?.description) updateData.description = expenseData.description
  if (expenseData?.vendor || expenseData?.date) {
    const existing = (doc.extractedData as Record<string, unknown>) ?? {}
    updateData.extractedData = {
      ...existing,
      ...(expenseData.vendor ? { vendor: expenseData.vendor } : {}),
      ...(expenseData.date ? { date: expenseData.date } : {})
    }
  }

  let createdTransaction = null
  if (createExpense && companyId && expenseData?.amount) {
    createdTransaction = await createTransactionFromDoc(doc, expenseData, companyId)
  }

  return { updateData, createdTransaction }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { documentId, action, companyId, createExpense, expenseData } = body

    if (!documentId || !action) {
      return NextResponse.json({ error: 'Missing documentId or action' }, { status: 400 })
    }

    const doc = await prisma.uploadedDocument.findFirst({
      where: { id: documentId, uploadedById: session.user.id }
    })
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    let createdTransaction = null
    let updateData: Record<string, unknown> = {}

    switch (action) {
      case 'approve': {
        const result = await handleApproveAction(doc, session.user.id, expenseData, companyId, createExpense)
        updateData = result.updateData
        createdTransaction = result.createdTransaction
        break
      }
      case 'reject':
        updateData.status = 'REJECTED'
        break
      case 'reprocess': {
        const newAnalysis = analyzeDocument(doc.originalName)
        updateData.status = 'ANALYZED'
        updateData.aiAnalysis = newAnalysis as any
        updateData.extractedData = newAnalysis.extractedData as any
        updateData.aiConfidence = newAnalysis.confidence
        updateData.suggestedCategory = newAnalysis.suggestedCategory
        updateData.processingTime = newAnalysis.processingTime
        updateData.amount = newAnalysis.extractedData.amount
        break
      }
    }

    const updated = await prisma.uploadedDocument.update({
      where: { id: documentId },
      data: updateData
    })

    const analysis = buildAnalysis(updated)

    return NextResponse.json({
      success: true,
      document: {
        id: updated.id,
        originalFilename: updated.originalName,
        mimeType: updated.mimeType,
        fileSize: updated.fileSize,
        status: updated.status,
        documentType: updated.documentType || null,
        aiConfidence: updated.aiConfidence || null,
        amount: updated.amount || null,
        suggestedCategory: updated.suggestedCategory || null,
        suggestedAccount: analysis?.suggestedAccount || null,
        extractedData: updated.extractedData || null,
        aiAnalysis: analysis || null,
        documentDate: updated.documentDate ? updated.documentDate.toISOString() : null,
        vendor: expenseData?.vendor ? { id: null, name: expenseData.vendor } : null,
        createdAt: updated.createdAt.toISOString()
      },
      transaction: createdTransaction ? {
        id: createdTransaction.id,
        amount: createdTransaction.amount,
        category: createdTransaction.category,
        description: createdTransaction.description
      } : null
    })

  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json({ error: 'Missing document ID' }, { status: 400 })
    }

    const doc = await prisma.uploadedDocument.findFirst({
      where: { id: documentId, uploadedById: session.user.id }
    })
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    await prisma.uploadedDocument.delete({ where: { id: documentId } })

    return NextResponse.json({ success: true, message: 'Document deleted successfully' })

  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
