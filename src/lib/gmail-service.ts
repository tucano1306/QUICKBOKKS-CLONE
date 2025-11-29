import { google } from 'googleapis'

/**
 * Gmail Service - Conecta con una cuenta Gmail para recibir emails automáticamente
 * 
 * CONFIGURACIÓN:
 * 1. Ve a https://console.cloud.google.com/
 * 2. Crea un proyecto nuevo
 * 3. Habilita Gmail API
 * 4. Crea credenciales OAuth 2.0 (Tipo: Aplicación web)
 * 5. Descarga el JSON y copia los valores a .env
 */

interface GmailMessage {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  body: string
  date: string
  attachments: Array<{
    filename: string
    mimeType: string
    size: number
    attachmentId: string
    data?: string
  }>
  labels: string[]
  snippet: string
}

interface ParsedEmail {
  id: string
  from: string
  to: string
  subject: string
  body: string
  html?: string
  date: string
  attachments: Array<{
    filename: string
    mimeType: string
    size: number
    data?: string
  }>
  companyCode: string | null
  documentType: string
}

class GmailService {
  private oauth2Client
  private gmail

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback'
    )

    // Si hay refresh token guardado, configurarlo
    if (process.env.GMAIL_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
      })
    }

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
  }

  /**
   * Genera URL para autorizar la cuenta Gmail
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify', // Para marcar como leído
    ]

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Forzar para obtener refresh_token
    })
  }

  /**
   * Intercambia código de autorización por tokens
   */
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code)
    this.oauth2Client.setCredentials(tokens)
    return tokens
  }

  /**
   * Verifica si está autenticado
   */
  isAuthenticated(): boolean {
    return !!process.env.GMAIL_REFRESH_TOKEN
  }

  /**
   * Obtiene emails no leídos
   */
  async getUnreadEmails(maxResults: number = 20): Promise<GmailMessage[]> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults
      })

      const messages = response.data.messages || []
      const emails: GmailMessage[] = []

      for (const msg of messages) {
        const email = await this.getEmailDetails(msg.id!)
        if (email) emails.push(email)
      }

      return emails
    } catch (error) {
      console.error('Error fetching unread emails:', error)
      throw error
    }
  }

  /**
   * Obtiene emails que contengan un código de empresa en el asunto
   */
  async getEmailsForCompany(companyCode: string, maxResults: number = 50): Promise<GmailMessage[]> {
    try {
      // Buscar emails con [CODIGO] en el asunto
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: `subject:[${companyCode}]`,
        maxResults
      })

      const messages = response.data.messages || []
      const emails: GmailMessage[] = []

      for (const msg of messages) {
        const email = await this.getEmailDetails(msg.id!)
        if (email) emails.push(email)
      }

      return emails
    } catch (error) {
      console.error('Error fetching company emails:', error)
      throw error
    }
  }

  /**
   * Obtiene detalles completos de un email
   */
  async getEmailDetails(messageId: string): Promise<GmailMessage | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      })

      const message = response.data
      const headers = message.payload?.headers || []

      const getHeader = (name: string) => 
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

      // Extraer cuerpo del mensaje
      let body = ''
      const extractBody = (part: any): string => {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8')
        }
        if (part.parts) {
          for (const subPart of part.parts) {
            const text = extractBody(subPart)
            if (text) return text
          }
        }
        return ''
      }

      if (message.payload) {
        body = extractBody(message.payload)
      }

      // Extraer adjuntos
      const attachments: GmailMessage['attachments'] = []
      const extractAttachments = (part: any) => {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType || 'application/octet-stream',
            size: part.body.size || 0,
            attachmentId: part.body.attachmentId
          })
        }
        if (part.parts) {
          for (const subPart of part.parts) {
            extractAttachments(subPart)
          }
        }
      }

      if (message.payload) {
        extractAttachments(message.payload)
      }

      return {
        id: message.id!,
        threadId: message.threadId!,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        body,
        date: getHeader('Date'),
        attachments,
        labels: message.labelIds || [],
        snippet: message.snippet || ''
      }
    } catch (error) {
      console.error('Error fetching email details:', error)
      return null
    }
  }

  /**
   * Descarga un adjunto
   */
  async getAttachment(messageId: string, attachmentId: string): Promise<string | null> {
    try {
      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId
      })

      return response.data.data || null // Base64 encoded
    } catch (error) {
      console.error('Error downloading attachment:', error)
      return null
    }
  }

  /**
   * Marca un email como leído
   */
  async markAsRead(messageId: string): Promise<boolean> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      })
      return true
    } catch (error) {
      console.error('Error marking as read:', error)
      return false
    }
  }

  /**
   * Agrega etiqueta a un email
   */
  async addLabel(messageId: string, labelName: string): Promise<boolean> {
    try {
      // Primero obtener o crear la etiqueta
      const labelsResponse = await this.gmail.users.labels.list({ userId: 'me' })
      let label = labelsResponse.data.labels?.find(l => l.name === labelName)

      if (!label) {
        const createResponse = await this.gmail.users.labels.create({
          userId: 'me',
          requestBody: { name: labelName }
        })
        label = createResponse.data
      }

      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [label.id!]
        }
      })
      return true
    } catch (error) {
      console.error('Error adding label:', error)
      return false
    }
  }

  /**
   * Parsea un email para extraer datos relevantes
   */
  parseEmail(email: GmailMessage): ParsedEmail {
    // Extraer código de empresa del asunto
    const subjectMatch = email.subject.match(/\[([A-Z0-9]+)\]/i)
    const bodyMatch = email.body.match(/empresa:\s*([A-Z0-9]+)/i)
    const companyCode = subjectMatch?.[1] || bodyMatch?.[1] || null

    // Detectar tipo de documento
    const text = (email.subject + ' ' + email.body).toLowerCase()
    let documentType = 'other'
    if (text.includes('factura') || text.includes('invoice')) documentType = 'invoice'
    else if (text.includes('recibo') || text.includes('receipt')) documentType = 'receipt'
    else if (text.includes('estado de cuenta') || text.includes('statement')) documentType = 'bank_statement'
    else if (text.includes('nómina') || text.includes('payroll')) documentType = 'payroll'
    else if (text.includes('gasto') || text.includes('expense')) documentType = 'expense'

    return {
      id: email.id,
      from: email.from,
      to: email.to,
      subject: email.subject,
      body: email.body,
      date: email.date,
      attachments: email.attachments.map(a => ({
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.size
      })),
      companyCode: companyCode?.toUpperCase() || null,
      documentType
    }
  }
}

// Singleton
let gmailService: GmailService | null = null

export function getGmailService(): GmailService {
  if (!gmailService) {
    gmailService = new GmailService()
  }
  return gmailService
}

export { GmailService }
export type { GmailMessage, ParsedEmail }
