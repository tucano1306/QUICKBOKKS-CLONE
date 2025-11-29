'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGmailService } from '@/lib/gmail-service'

/**
 * Sistema de Email Inbox con Gmail API
 * 
 * Formato de asunto para identificar empresa:
 * [CODIGO] Factura de proveedor X
 * [ABC123] Recibo de pago
 * 
 * O en el cuerpo:
 * Empresa: ABC123
 */

interface EmailMessage {
  id: string
  from: string
  to: string
  subject: string
  body: string
  date: string
  attachments: Array<{
    filename: string
    mimeType: string
    size: number
    data?: string // Base64
  }>
  companyCode?: string
  processed: boolean
}

// Cola de emails en memoria (en producción usar Redis/DB)
const emailInbox: Map<string, EmailMessage[]> = new Map()
let lastCheckTime = new Date()

// Emails de ejemplo para demostración
const demoEmails: EmailMessage[] = [
  {
    id: 'demo-1',
    from: 'proveedor@empresa.com',
    to: 'tuapp.docs@gmail.com',
    subject: '[DEMO123] Factura #001 - Servicios Noviembre',
    body: `Adjunto factura por servicios prestados.
    
Monto: $1,500.00
Fecha: 28/11/2025
Vencimiento: 28/12/2025

Empresa: DEMO123`,
    date: new Date().toISOString(),
    attachments: [
      { filename: 'factura_001.pdf', mimeType: 'application/pdf', size: 125000 }
    ],
    companyCode: 'DEMO123',
    processed: false
  },
  {
    id: 'demo-2',
    from: 'contador@gmail.com',
    to: 'tuapp.docs@gmail.com',
    subject: '[DEMO123] Recibos de gastos semana 47',
    body: `Buenos días,

Adjunto los recibos de gastos de la semana:
- Gasolina: $85.00
- Suministros oficina: $120.00
- Comida reunión cliente: $65.00

Total: $270.00
Empresa: DEMO123`,
    date: new Date(Date.now() - 3600000).toISOString(),
    attachments: [
      { filename: 'recibo_gas.jpg', mimeType: 'image/jpeg', size: 85000 },
      { filename: 'recibo_oficina.jpg', mimeType: 'image/jpeg', size: 92000 },
      { filename: 'recibo_comida.jpg', mimeType: 'image/jpeg', size: 78000 }
    ],
    companyCode: 'DEMO123',
    processed: false
  },
  {
    id: 'demo-3',
    from: 'banco@bancoejemplo.com',
    to: 'tuapp.docs@gmail.com',
    subject: '[DEMO123] Estado de cuenta Noviembre 2025',
    body: `Estimado cliente,

Adjunto su estado de cuenta del mes de Noviembre 2025.

Saldo anterior: $5,230.00
Depósitos: $12,500.00
Retiros: $8,340.00
Saldo actual: $9,390.00

Empresa: DEMO123`,
    date: new Date(Date.now() - 86400000).toISOString(),
    attachments: [
      { filename: 'estado_cuenta_nov.pdf', mimeType: 'application/pdf', size: 245000 }
    ],
    companyCode: 'DEMO123',
    processed: false
  }
]

// Inicializar con emails demo
emailInbox.set('DEMO123', [...demoEmails])

// Extraer código de empresa del asunto o cuerpo
function extractCompanyCode(subject: string, body: string): string | null {
  // Buscar [CODIGO] en el asunto
  const subjectMatch = subject.match(/\[([A-Z0-9]+)\]/i)
  if (subjectMatch) return subjectMatch[1].toUpperCase()
  
  // Buscar "Empresa: CODIGO" en el cuerpo
  const bodyMatch = body.match(/empresa:\s*([A-Z0-9]+)/i)
  if (bodyMatch) return bodyMatch[1].toUpperCase()
  
  // Buscar "Código: CODIGO" en el cuerpo
  const codeMatch = body.match(/c[oó]digo:\s*([A-Z0-9]+)/i)
  if (codeMatch) return codeMatch[1].toUpperCase()
  
  return null
}

// Detectar tipo de documento
function detectDocumentType(subject: string, body: string): string {
  const text = (subject + ' ' + body).toLowerCase()
  
  if (text.includes('factura') || text.includes('invoice')) return 'invoice'
  if (text.includes('recibo') || text.includes('receipt')) return 'receipt'
  if (text.includes('estado de cuenta') || text.includes('statement')) return 'bank_statement'
  if (text.includes('nómina') || text.includes('payroll')) return 'payroll'
  if (text.includes('gasto') || text.includes('expense')) return 'expense'
  
  return 'other'
}

// Extraer montos del texto
function extractAmounts(text: string): number[] {
  const matches = text.match(/\$[\d,]+\.?\d*/g) || []
  return matches.map(m => parseFloat(m.replace(/[$,]/g, ''))).filter(n => !isNaN(n))
}

// GET - Obtener emails para una empresa
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const companyCode = searchParams.get('companyCode') || companyId
    const showProcessed = searchParams.get('showProcessed') === 'true'
    
    if (!companyCode) {
      // Retornar todos los emails para debug
      const allEmails: EmailMessage[] = []
      emailInbox.forEach((emails) => allEmails.push(...emails))
      
      return NextResponse.json({
        emails: allEmails,
        total: allEmails.length,
        companies: Array.from(emailInbox.keys())
      })
    }
    
    const emails = emailInbox.get(companyCode.toUpperCase()) || []
    const filtered = showProcessed ? emails : emails.filter(e => !e.processed)
    
    return NextResponse.json({
      emails: filtered,
      total: emails.length,
      pending: emails.filter(e => !e.processed).length,
      processed: emails.filter(e => e.processed).length,
      companyCode: companyCode.toUpperCase(),
      lastCheck: lastCheckTime.toISOString()
    })
    
  } catch (error) {
    console.error('Error fetching emails:', error)
    return NextResponse.json({ error: 'Error fetching emails' }, { status: 500 })
  }
}

// POST - Simular recepción de email (para testing) o marcar como procesado
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { action } = body
    
    if (action === 'mark_processed') {
      // Marcar email como procesado
      const { emailId, companyCode } = body
      const emails = emailInbox.get(companyCode.toUpperCase())
      if (emails) {
        const email = emails.find(e => e.id === emailId)
        if (email) {
          email.processed = true
          return NextResponse.json({ success: true, message: 'Email marked as processed' })
        }
      }
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }
    
    if (action === 'simulate_email') {
      // Simular recepción de email (para testing)
      const { from, subject, body: emailBody, companyCode: code } = body
      
      const companyCode = code || extractCompanyCode(subject, emailBody)
      if (!companyCode) {
        return NextResponse.json({ 
          error: 'No company code found. Use [CODIGO] in subject or "Empresa: CODIGO" in body' 
        }, { status: 400 })
      }
      
      const newEmail: EmailMessage = {
        id: `email-${Date.now()}`,
        from: from || 'test@example.com',
        to: 'tuapp.docs@gmail.com',
        subject: subject || 'Test email',
        body: emailBody || '',
        date: new Date().toISOString(),
        attachments: [],
        companyCode: companyCode.toUpperCase(),
        processed: false
      }
      
      if (!emailInbox.has(companyCode.toUpperCase())) {
        emailInbox.set(companyCode.toUpperCase(), [])
      }
      emailInbox.get(companyCode.toUpperCase())!.unshift(newEmail)
      
      return NextResponse.json({
        success: true,
        message: 'Email simulated successfully',
        email: newEmail,
        documentType: detectDocumentType(subject, emailBody),
        extractedAmounts: extractAmounts(emailBody)
      })
    }
    
    if (action === 'check_inbox') {
      // Revisar inbox de Gmail real
      const gmailService = getGmailService()
      
      if (!gmailService.isAuthenticated()) {
        return NextResponse.json({
          success: false,
          message: 'Gmail not connected. Please authorize Gmail first.',
          needsAuth: true,
          authUrl: '/api/auth/gmail'
        }, { status: 401 })
      }
      
      try {
        // Obtener nuevos emails de Gmail
        const newEmails = await gmailService.getUnreadEmails(50)
        lastCheckTime = new Date()
        
        // Procesar cada email y clasificarlo por empresa
        for (const email of newEmails) {
          const details = await gmailService.getEmailDetails(email.id || '')
          if (details) {
            const companyCode = extractCompanyCode(details.subject || '', details.body || '')
            
            if (companyCode) {
              const emailMessage: EmailMessage = {
                id: email.id || `email-${Date.now()}`,
                from: details.from || '',
                to: 'inbox',
                subject: details.subject || '',
                body: details.body || '',
                date: details.date || new Date().toISOString(),
                attachments: details.attachments.map(att => ({
                  filename: att.filename,
                  mimeType: att.mimeType,
                  size: att.size,
                  data: att.data
                })),
                companyCode: companyCode.toUpperCase(),
                processed: false
              }
              
              if (!emailInbox.has(companyCode.toUpperCase())) {
                emailInbox.set(companyCode.toUpperCase(), [])
              }
              
              // Evitar duplicados
              const existing = emailInbox.get(companyCode.toUpperCase())!
              if (!existing.find(e => e.id === emailMessage.id)) {
                existing.unshift(emailMessage)
              }
            }
          }
        }
        
        return NextResponse.json({
          success: true,
          message: 'Inbox checked via Gmail',
          lastCheck: lastCheckTime.toISOString(),
          newEmails: newEmails.length
        })
      } catch (gmailError) {
        console.error('Gmail fetch error:', gmailError)
        return NextResponse.json({
          success: false,
          message: 'Error fetching from Gmail',
          error: gmailError instanceof Error ? gmailError.message : 'Unknown error'
        }, { status: 500 })
      }
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('Error processing email action:', error)
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 })
  }
}

// DELETE - Eliminar email
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('emailId')
    const companyCode = searchParams.get('companyCode')
    
    if (!emailId || !companyCode) {
      return NextResponse.json({ error: 'emailId and companyCode required' }, { status: 400 })
    }
    
    const emails = emailInbox.get(companyCode.toUpperCase())
    if (emails) {
      const index = emails.findIndex(e => e.id === emailId)
      if (index !== -1) {
        emails.splice(index, 1)
        return NextResponse.json({ success: true, message: 'Email deleted' })
      }
    }
    
    return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    
  } catch (error) {
    console.error('Error deleting email:', error)
    return NextResponse.json({ error: 'Error deleting email' }, { status: 500 })
  }
}
