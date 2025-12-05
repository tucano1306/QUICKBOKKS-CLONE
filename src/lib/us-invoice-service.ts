import { prisma } from './prisma'
import { generateUSInvoicePDF } from './us-invoice-generator'
import nodemailer from 'nodemailer'
import { format } from 'date-fns'
import fs from 'fs/promises'
import path from 'path'
import type { Invoice, Customer, InvoiceItem, Product } from '@prisma/client'
import { createInvoiceJournalEntry } from './accounting-service'

interface InvoiceGenerationResponse {
  success: boolean
  invoiceNumber?: string
  pdfBuffer?: Buffer
  pdfPath?: string
  eInvoiceId?: string
  error?: string
}

interface EmailInvoiceResponse {
  success: boolean
  messageId?: string
  error?: string
}

interface InvoiceStatusResponse {
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  paidAmount: number
  balance: number
  dueDate: Date
  sentDate?: Date
  paidDate?: Date
}

/**
 * Servicio para generación y gestión de facturas electrónicas de EE.UU.
 */
export class USInvoiceService {
  private smtpHost: string
  private smtpPort: number
  private smtpUser: string
  private smtpPassword: string
  private companyEmail: string
  private invoicesDir: string
  
  constructor(config?: any) {
    this.smtpHost = config?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com'
    this.smtpPort = config?.smtpPort || parseInt(process.env.SMTP_PORT || '587')
    this.smtpUser = config?.smtpUser || process.env.SMTP_USER || ''
    this.smtpPassword = config?.smtpPassword || process.env.SMTP_PASSWORD || ''
    this.companyEmail = config?.companyEmail || process.env.COMPANY_EMAIL || ''
    this.invoicesDir = config?.invoicesDir || path.join(process.cwd(), 'invoices')
  }
  
  /**
   * Genera una factura en formato PDF para EE.UU.
   */
  async generateInvoicePDF(invoiceId: string): Promise<InvoiceGenerationResponse> {
    try {
      // Obtener la factura con todos sus datos relacionados
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          customer: true,
          items: {
            include: {
              product: true
            }
          },
          user: true
        }
      })
      
      if (!invoice) {
        return { success: false, error: 'Factura no encontrada' }
      }
      
      // Transformar datos al formato requerido por generateUSInvoicePDF
      const inv = invoice as any // TypeScript casting temporal
      const invoiceData = {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        company: {
          name: process.env.COMPANY_NAME || 'Your Company',
          ein: process.env.COMPANY_EIN || '00-0000000',
          address: process.env.COMPANY_ADDRESS || '',
          city: process.env.COMPANY_CITY || '',
          state: process.env.COMPANY_STATE || 'FL',
          zip: process.env.COMPANY_ZIP || '',
          phone: process.env.COMPANY_PHONE,
          email: process.env.COMPANY_EMAIL
        },
        customer: {
          name: invoice.customer.name,
          taxId: invoice.customer.taxId || undefined,
          address: invoice.customer.address || '',
          city: invoice.customer.city || '',
          state: invoice.customer.state || 'FL',
          zip: invoice.customer.zipCode || '',
          email: invoice.customer.email || undefined
        },
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        poNumber: inv.poNumber || undefined,
        items: invoice.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.total,
          taxable: true
        })),
        subtotal: invoice.subtotal,
        discount: invoice.discount > 0 ? invoice.discount : undefined,
        taxRate: inv.salesTaxRate || 0.07,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        paymentTerms: inv.paymentTerms || undefined,
        notes: invoice.notes || undefined,
        taxExempt: inv.taxExempt || false,
        exemptionCertificate: inv.taxExemptReason || undefined
      }
      
      // Generar el PDF
      const pdfBuffer = await generateUSInvoicePDF(invoiceData)
      
      // Crear directorio de facturas si no existe
      await fs.mkdir(this.invoicesDir, { recursive: true })
      
      // Guardar PDF en el sistema de archivos
      const fileName = `invoice-${invoice.invoiceNumber}-${Date.now()}.pdf`
      const filePath = path.join(this.invoicesDir, fileName)
      await fs.writeFile(filePath, Buffer.from(pdfBuffer))
      
      // Guardar registro de e-invoice en la base de datos
      const eInvoice = await (prisma as any).eInvoice.upsert({
        where: { invoiceId: invoice.id },
        create: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          companyName: invoiceData.company.name,
          companyEIN: invoiceData.company.ein,
          companyAddress: invoiceData.company.address,
          companyCity: invoiceData.company.city,
          companyState: invoiceData.company.state,
          companyZip: invoiceData.company.zip,
          companyPhone: invoiceData.company.phone,
          companyEmail: invoiceData.company.email,
          customerName: invoice.customer.name,
          customerTaxId: invoice.customer.taxId,
          customerAddress: invoice.customer.address || '',
          customerCity: invoice.customer.city || '',
          customerState: invoice.customer.state || 'FL',
          customerZip: invoice.customer.zipCode || '',
          customerEmail: invoice.customer.email,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          poNumber: inv.poNumber,
          subtotal: invoice.subtotal,
          discountAmount: invoice.discount,
          taxableAmount: invoice.subtotal - invoice.discount,
          salesTaxRate: inv.salesTaxRate || 0.07,
          salesTaxAmount: invoice.taxAmount,
          totalAmount: invoice.total,
          floridaSalesTax: true,
          taxExempt: inv.taxExempt || false,
          exemptionCertificate: inv.taxExemptReason,
          paymentTerms: inv.paymentTerms,
          pdfPath: filePath,
          status: 'GENERATED'
        },
        update: {
          pdfPath: filePath,
          status: 'GENERATED',
          updatedAt: new Date()
        }
      })
      
      return {
        success: true,
        invoiceNumber: invoice.invoiceNumber,
        pdfBuffer: Buffer.from(pdfBuffer),
        pdfPath: filePath,
        eInvoiceId: eInvoice.id
      }
      
    } catch (error: any) {
      console.error('Error al generar factura PDF:', error)
      return {
        success: false,
        error: error.message || 'Error al generar factura'
      }
    }
  }
  
  /**
   * Envía una factura por correo electrónico
   */
  async sendInvoiceByEmail(invoiceId: string, options?: {
    recipientEmail?: string
    ccEmails?: string[]
    subject?: string
    message?: string
  }): Promise<EmailInvoiceResponse> {
    try {
      // Generar PDF si no existe
      let pdfData = await this.generateInvoicePDF(invoiceId)
      
      if (!pdfData.success || !pdfData.pdfBuffer) {
        return { success: false, error: pdfData.error || 'No se pudo generar el PDF' }
      }
      
      // Obtener datos de la factura
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { customer: true }
      })
      const inv = invoice as any
      
      if (!invoice) {
        return { success: false, error: 'Factura no encontrada' }
      }
      
      const recipientEmail = options?.recipientEmail || invoice.customer.email
      
      if (!recipientEmail) {
        return { success: false, error: 'No se especificó email del destinatario' }
      }
      
      // Configurar transporte SMTP
      const transporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpPort === 465,
        auth: {
          user: this.smtpUser,
          pass: this.smtpPassword
        }
      })
      
      // Preparar email
      const subject = options?.subject || `Invoice ${invoice.invoiceNumber} from ${process.env.COMPANY_NAME || 'Your Company'}`
      const message = options?.message || `
Dear ${invoice.customer.name},

Please find attached invoice ${invoice.invoiceNumber} for $${invoice.total.toFixed(2)}.

Due Date: ${format(new Date(invoice.dueDate), 'MMMM dd, yyyy')}

Payment Terms: ${inv?.paymentTerms || 'Net 30'}

If you have any questions, please don't hesitate to contact us.

Thank you for your business!

Best regards,
${process.env.COMPANY_NAME || 'Your Company'}
      `
      
      // Enviar email
      const info = await transporter.sendMail({
        from: this.companyEmail,
        to: recipientEmail,
        cc: options?.ccEmails?.join(','),
        subject,
        text: message,
        attachments: [
          {
            filename: `Invoice-${invoice.invoiceNumber}.pdf`,
            content: pdfData.pdfBuffer
          }
        ]
      })
      
      // Actualizar estado de la factura
      const wasInDraft = invoice.status === 'DRAFT';
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { 
          status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status,
        }
      })
      
      // CREAR ASIENTO CONTABLE cuando la factura cambia de DRAFT a SENT
      // Esto reconoce el ingreso según GAAP (cuando se entrega al cliente)
      if (wasInDraft && invoice.companyId) {
        await createInvoiceJournalEntry(
          invoice.companyId,
          invoice.total,
          invoice.invoiceNumber,
          invoice.customer.name,
          new Date(),
          'system' // Creado por el sistema al enviar
        );
      }
      
      // Actualizar e-invoice
      await (prisma as any).eInvoice.update({
        where: { invoiceId },
        data: {
          status: 'SENT',
          sentDate: new Date()
        }
      })
      
      return {
        success: true,
        messageId: info.messageId
      }
      
    } catch (error: any) {
      console.error('Error al enviar factura por email:', error)
      return {
        success: false,
        error: error.message || 'Error al enviar factura'
      }
    }
  }
  
  /**
   * Consulta el estado de una factura
   */
  async getInvoiceStatus(invoiceId: string): Promise<InvoiceStatusResponse | { error: string }> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          payments: true
        }
      })
      
      const eInvoice = await (prisma as any).eInvoice.findUnique({
        where: { invoiceId }
      })
      
      if (!invoice) {
        return { error: 'Factura no encontrada' }
      }
      
      // Calcular pagos realizados
      const paidAmount = invoice.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0)
      const balance = invoice.total - paidAmount
      
      // Determinar si está vencida
      const now = new Date()
      const dueDate = new Date(invoice.dueDate)
      const isOverdue = balance > 0 && now > dueDate
      
      let status = invoice.status
      if (isOverdue && status !== 'PAID') {
        status = 'OVERDUE'
        
        // Actualizar estado en la base de datos
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: 'OVERDUE' }
        })
      }
      
      return {
        status: status as 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED',
        paidAmount,
        balance,
        dueDate: invoice.dueDate,
        sentDate: eInvoice?.sentDate || undefined,
        paidDate: paidAmount >= invoice.total ? invoice.payments[invoice.payments.length - 1]?.createdAt : undefined
      }
      
    } catch (error: any) {
      console.error('Error al consultar estado de factura:', error)
      return { error: error.message }
    }
  }
  
  /**
   * Cancela una factura
   */
  async cancelInvoice(invoiceId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true }
      })
      
      if (!invoice) {
        return { success: false, error: 'Factura no encontrada' }
      }
      
      // Verificar que no tenga pagos
      if (invoice.payments.length > 0) {
        return { success: false, error: 'No se puede cancelar una factura con pagos registrados' }
      }
      
      // Actualizar estado
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'CANCELLED',
          notes: `${invoice.notes || ''}\n\nCANCELLED: ${reason}`
        }
      })
      
      // Actualizar e-invoice si existe
      await (prisma as any).eInvoice.updateMany({
        where: { invoiceId },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason,
          cancellationDate: new Date()
        }
      })
      
      return { success: true }
      
    } catch (error: any) {
      console.error('Error al cancelar factura:', error)
      return {
        success: false,
        error: error.message || 'Error al cancelar factura'
      }
    }
  }
  
  /**
   * Regenera el PDF de una factura
   */
  async regenerateInvoicePDF(invoiceId: string): Promise<InvoiceGenerationResponse> {
    try {
      // Eliminar e-invoice anterior
      await (prisma as any).eInvoice.deleteMany({
        where: { invoiceId }
      })
      
      // Generar nuevo PDF
      return await this.generateInvoicePDF(invoiceId)
      
    } catch (error: any) {
      console.error('Error al regenerar factura:', error)
      return {
        success: false,
        error: error.message || 'Error al regenerar factura'
      }
    }
  }
}

/**
 * Genera y envía una factura completa
 */
export async function processInvoice(
  invoiceId: string,
  options?: {
    generatePDF?: boolean
    sendEmail?: boolean
    recipientEmail?: string
  }
): Promise<{ success: boolean; invoiceNumber?: string; error?: string }> {
  try {
    const invoiceService = new USInvoiceService()
    
    // Obtener la factura
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true }
    })
    
    if (!invoice) {
      return { success: false, error: 'Factura no encontrada' }
    }
    
    let pdfGenerated = false
    let emailSent = false
    
    // Generar PDF si se solicita
    if (options?.generatePDF !== false) {
      const pdfResult = await invoiceService.generateInvoicePDF(invoiceId)
      
      if (!pdfResult.success) {
        return { success: false, error: pdfResult.error }
      }
      
      pdfGenerated = true
    }
    
    // Enviar email si se solicita
    if (options?.sendEmail) {
      const emailResult = await invoiceService.sendInvoiceByEmail(invoiceId, {
        recipientEmail: options.recipientEmail
      })
      
      if (!emailResult.success) {
        return { success: false, error: emailResult.error }
      }
      
      emailSent = true
    }
    
    return {
      success: true,
      invoiceNumber: invoice.invoiceNumber
    }
    
  } catch (error: any) {
    console.error('Error al procesar factura:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Genera un reporte de facturas vencidas
 */
export async function getOverdueInvoicesReport(): Promise<{
  invoices: Array<{
    id: string
    invoiceNumber: string
    customerName: string
    total: number
    balance: number
    dueDate: Date
    daysOverdue: number
  }>
  totalOverdue: number
}> {
  const now = new Date()
  
  const invoices = await prisma.invoice.findMany({
    where: {
      status: {
        in: ['SENT', 'OVERDUE']
      },
      dueDate: {
        lt: now
      }
    },
    include: {
      customer: true,
      payments: true
    },
    orderBy: {
      dueDate: 'asc'
    }
  })
  
  const overdueInvoices = invoices.map(invoice => {
    const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
    const balance = invoice.total - paidAmount
    const daysOverdue = Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer.name,
      total: invoice.total,
      balance,
      dueDate: invoice.dueDate,
      daysOverdue
    }
  }).filter(inv => inv.balance > 0)
  
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.balance, 0)
  
  return {
    invoices: overdueInvoices,
    totalOverdue
  }
}
