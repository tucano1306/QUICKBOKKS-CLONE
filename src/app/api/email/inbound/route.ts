
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * API para recibir emails entrantes
 * Compatible con: Cloudflare Email Workers, Mailgun, SendGrid webhooks
 * 
 * Cada empresa tiene un código único para recibir emails:
 * docs+CODIGO@tudominio.com
 * o
 * CODIGO@inbox.tudominio.com
 */

interface InboundEmail {
  from: string
  to: string
  subject: string
  body: string
  html?: string
  attachments?: Array<{
    filename: string
    contentType: string
    content: string // Base64
    size: number
  }>
  headers?: Record<string, string>
  timestamp?: string
}

interface ProcessedDocument {
  id: string
  type: 'invoice' | 'receipt' | 'statement' | 'payroll' | 'other'
  companyId: string
  senderEmail: string
  subject: string
  extractedData: Record<string, unknown>
  attachments: string[]
  status: 'pending' | 'processed' | 'error'
  createdAt: string
}

// Almacenamiento temporal en memoria (en producción usar DB)
const emailQueue: Map<string, ProcessedDocument[]> = new Map()

// Extraer código de empresa del email destino
function extractCompanyCode(toEmail: string): string | null {
  // Formato: docs+CODIGO@dominio.com
  const plusMatch = toEmail.match(/docs\+([A-Z0-9]+)@/i)
  if (plusMatch) return plusMatch[1].toUpperCase()
  
  // Formato: CODIGO@inbox.dominio.com
  const subdomainMatch = toEmail.match(/^([A-Z0-9]+)@inbox\./i)
  if (subdomainMatch) return subdomainMatch[1].toUpperCase()
  
  // Formato: CODIGO.docs@dominio.com
  const prefixMatch = toEmail.match(/^([A-Z0-9]+)\.docs@/i)
  if (prefixMatch) return prefixMatch[1].toUpperCase()
  
  return null
}

// Detectar tipo de documento por el asunto/contenido
function detectDocumentType(subject: string, body: string): ProcessedDocument['type'] {
  const subjectLower = subject.toLowerCase()
  const bodyLower = body.toLowerCase()
  
  if (subjectLower.includes('factura') || subjectLower.includes('invoice') || 
      bodyLower.includes('factura') || bodyLower.includes('invoice')) {
    return 'invoice'
  }
  
  if (subjectLower.includes('recibo') || subjectLower.includes('receipt') ||
      bodyLower.includes('recibo') || bodyLower.includes('receipt')) {
    return 'receipt'
  }
  
  if (subjectLower.includes('estado de cuenta') || subjectLower.includes('statement') ||
      subjectLower.includes('bank') || subjectLower.includes('banco')) {
    return 'statement'
  }
  
  if (subjectLower.includes('nómina') || subjectLower.includes('payroll') ||
      subjectLower.includes('salario') || subjectLower.includes('w-2')) {
    return 'payroll'
  }
  
  return 'other'
}

// Extraer datos básicos del email
function extractBasicData(email: InboundEmail): Record<string, unknown> {
  const data: Record<string, unknown> = {
    senderEmail: email.from,
    receivedAt: email.timestamp || new Date().toISOString(),
    subject: email.subject,
    hasAttachments: (email.attachments?.length || 0) > 0,
    attachmentCount: email.attachments?.length || 0,
  }
  
  // Buscar montos en el cuerpo
  const amountMatch = email.body.match(/\$[\d,]+\.?\d*/g)
  if (amountMatch) {
    data.detectedAmounts = amountMatch.map(a => parseFloat(a.replace(/[$,]/g, '')))
  }
  
  // Buscar fechas
  const dateMatch = email.body.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g)
  if (dateMatch) {
    data.detectedDates = dateMatch
  }
  
  return data
}

// POST - Recibir email entrante (webhook)
export async function POST(request: NextRequest) {
  try {
    // Verificar API key o firma del webhook
    const apiKey = request.headers.get('x-api-key')
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET
    
    // En desarrollo permitir sin auth, en producción requerir
    if (process.env.NODE_ENV === 'production' && webhookSecret && apiKey !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const contentType = request.headers.get('content-type') || ''
    let emailData: InboundEmail
    
    // Soportar diferentes formatos de webhook
    if (contentType.includes('multipart/form-data')) {
      // Formato Mailgun/SendGrid
      const formData = await request.formData()
      emailData = {
        from: formData.get('from') as string || formData.get('sender') as string || '',
        to: formData.get('to') as string || formData.get('recipient') as string || '',
        subject: formData.get('subject') as string || '',
        body: formData.get('body-plain') as string || formData.get('text') as string || '',
        html: formData.get('body-html') as string || formData.get('html') as string || '',
        timestamp: formData.get('timestamp') as string || new Date().toISOString(),
        attachments: []
      }
      
      // Procesar adjuntos si vienen en el form
      const attachmentCount = parseInt(formData.get('attachment-count') as string || '0')
      for (let i = 1; i <= attachmentCount; i++) {
        const file = formData.get(`attachment-${i}`) as File
        if (file) {
          const buffer = await file.arrayBuffer()
          emailData.attachments!.push({
            filename: file.name,
            contentType: file.type,
            content: Buffer.from(buffer).toString('base64'),
            size: file.size
          })
        }
      }
    } else {
      // Formato JSON (Cloudflare Email Workers, custom)
      emailData = await request.json()
    }
    
    // Validar datos mínimos
    if (!emailData.to || !emailData.from) {
      return NextResponse.json({ 
        error: 'Missing required fields: from, to' 
      }, { status: 400 })
    }
    
    // Extraer código de empresa
    const companyCode = extractCompanyCode(emailData.to)
    
    if (!companyCode) {
      console.log('No company code found in email:', emailData.to)
      return NextResponse.json({ 
        error: 'Invalid recipient format. Use: docs+CODIGO@domain.com',
        received: emailData.to
      }, { status: 400 })
    }
    
    // Buscar empresa por código
    let company = null
    try {
      company = await prisma.company.findFirst({
        where: {
          OR: [
            { id: companyCode },
            // Buscar en taxId los últimos 6 caracteres
            { taxId: { endsWith: companyCode } }
          ]
        }
      })
    } catch (dbError) {
      console.log('DB lookup failed, using in-memory:', dbError)
    }
    
    const companyId = company?.id || companyCode
    
    // Detectar tipo de documento
    const docType = detectDocumentType(emailData.subject, emailData.body)
    
    // Extraer datos
    const extractedData = extractBasicData(emailData)
    
    // Crear registro de documento
    const processedDoc: ProcessedDocument = {
      id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: docType,
      companyId,
      senderEmail: emailData.from,
      subject: emailData.subject,
      extractedData,
      attachments: emailData.attachments?.map(a => a.filename) || [],
      status: 'pending',
      createdAt: new Date().toISOString()
    }
    
    // Guardar en cola
    if (!emailQueue.has(companyId)) {
      emailQueue.set(companyId, [])
    }
    emailQueue.get(companyId)!.push(processedDoc)
    
    // TODO: Aquí se integraría con el AI Document Processor existente
    // para procesar los adjuntos con OCR y categorización automática
    
    console.log(`📧 Email recibido para empresa ${companyId}:`, {
      from: emailData.from,
      subject: emailData.subject,
      type: docType,
      attachments: processedDoc.attachments.length
    })
    
    return NextResponse.json({
      success: true,
      message: 'Email received and queued for processing',
      document: {
        id: processedDoc.id,
        type: processedDoc.type,
        companyId: processedDoc.companyId,
        status: processedDoc.status
      }
    })
    
  } catch (error) {
    console.error('Error processing inbound email:', error)
    return NextResponse.json({ 
      error: 'Error processing email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET - Obtener emails pendientes para una empresa
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status') // pending, processed, error, all
    
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }
    
    const documents = emailQueue.get(companyId) || []
    
    // Filtrar por status si se especifica
    const filtered = status && status !== 'all'
      ? documents.filter(d => d.status === status)
      : documents
    
    return NextResponse.json({
      documents: filtered,
      total: documents.length,
      pending: documents.filter(d => d.status === 'pending').length,
      processed: documents.filter(d => d.status === 'processed').length,
      errors: documents.filter(d => d.status === 'error').length
    })
    
  } catch (error) {
    console.error('Error fetching email documents:', error)
    return NextResponse.json({ error: 'Error fetching documents' }, { status: 500 })
  }
}
