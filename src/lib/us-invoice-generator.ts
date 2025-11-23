import { prisma } from './prisma'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

interface USInvoiceData {
  invoiceId: string
  invoiceNumber: string
  company: {
    name: string
    ein: string
    address: string
    city: string
    state: string
    zip: string
    phone?: string
    email?: string
  }
  customer: {
    name: string
    taxId?: string
    address: string
    city: string
    state: string
    zip: string
    email?: string
  }
  issueDate: Date
  dueDate?: Date
  poNumber?: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    amount: number
    taxable: boolean
  }>
  subtotal: number
  discount?: number
  taxRate: number
  taxAmount: number
  total: number
  paymentTerms?: string
  notes?: string
  taxExempt?: boolean
  exemptionCertificate?: string
}

/**
 * Genera PDF de factura para USA (Florida)
 */
export async function generateUSInvoicePDF(data: USInvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // US Letter size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  const { width, height } = page.getSize()
  let yPosition = height - 50
  
  // Company Header
  page.drawText(data.company.name.toUpperCase(), {
    x: 50,
    y: yPosition,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1)
  })
  
  yPosition -= 20
  page.drawText(`EIN: ${data.company.ein}`, { x: 50, y: yPosition, size: 10, font })
  yPosition -= 15
  page.drawText(data.company.address, { x: 50, y: yPosition, size: 10, font })
  yPosition -= 15
  page.drawText(`${data.company.city}, ${data.company.state} ${data.company.zip}`, { 
    x: 50, y: yPosition, size: 10, font 
  })
  
  if (data.company.phone) {
    yPosition -= 15
    page.drawText(`Phone: ${data.company.phone}`, { x: 50, y: yPosition, size: 10, font })
  }
  
  if (data.company.email) {
    yPosition -= 15
    page.drawText(`Email: ${data.company.email}`, { x: 50, y: yPosition, size: 10, font })
  }
  
  // Invoice Title
  page.drawText('INVOICE', {
    x: width - 150,
    y: height - 50,
    size: 24,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.8)
  })
  
  // Invoice Details
  yPosition = height - 90
  page.drawText(`Invoice #: ${data.invoiceNumber}`, { 
    x: width - 200, y: yPosition, size: 10, font: fontBold 
  })
  
  yPosition -= 20
  page.drawText(`Date: ${data.issueDate.toLocaleDateString('en-US')}`, { 
    x: width - 200, y: yPosition, size: 10, font 
  })
  
  if (data.dueDate) {
    yPosition -= 20
    page.drawText(`Due Date: ${data.dueDate.toLocaleDateString('en-US')}`, { 
      x: width - 200, y: yPosition, size: 10, font 
    })
  }
  
  if (data.poNumber) {
    yPosition -= 20
    page.drawText(`PO #: ${data.poNumber}`, { 
      x: width - 200, y: yPosition, size: 10, font 
    })
  }
  
  // Bill To Section
  yPosition = height - 200
  page.drawText('BILL TO:', { x: 50, y: yPosition, size: 12, font: fontBold })
  yPosition -= 20
  page.drawText(data.customer.name, { x: 50, y: yPosition, size: 10, font: fontBold })
  
  if (data.customer.taxId) {
    yPosition -= 15
    page.drawText(`Tax ID: ${data.customer.taxId}`, { x: 50, y: yPosition, size: 10, font })
  }
  
  yPosition -= 15
  page.drawText(data.customer.address, { x: 50, y: yPosition, size: 10, font })
  yPosition -= 15
  page.drawText(`${data.customer.city}, ${data.customer.state} ${data.customer.zip}`, { 
    x: 50, y: yPosition, size: 10, font 
  })
  
  if (data.customer.email) {
    yPosition -= 15
    page.drawText(`Email: ${data.customer.email}`, { x: 50, y: yPosition, size: 10, font })
  }
  
  // Items Table
  yPosition -= 50
  const tableTop = yPosition
  
  // Table Headers
  page.drawRectangle({
    x: 40,
    y: yPosition - 5,
    width: width - 80,
    height: 25,
    color: rgb(0.9, 0.9, 0.9)
  })
  
  page.drawText('Description', { x: 50, y: yPosition, size: 10, font: fontBold })
  page.drawText('Qty', { x: 320, y: yPosition, size: 10, font: fontBold })
  page.drawText('Unit Price', { x: 380, y: yPosition, size: 10, font: fontBold })
  page.drawText('Amount', { x: 480, y: yPosition, size: 10, font: fontBold })
  
  yPosition -= 25
  
  // Table Items
  data.items.forEach((item) => {
    if (yPosition < 100) {
      // Add new page if needed
      const newPage = pdfDoc.addPage([612, 792])
      yPosition = height - 50
    }
    
    page.drawText(item.description, { x: 50, y: yPosition, size: 10, font })
    page.drawText(item.quantity.toString(), { x: 330, y: yPosition, size: 10, font })
    page.drawText(`$${item.unitPrice.toFixed(2)}`, { x: 380, y: yPosition, size: 10, font })
    page.drawText(`$${item.amount.toFixed(2)}`, { x: 480, y: yPosition, size: 10, font })
    
    yPosition -= 20
  })
  
  // Totals Section
  yPosition -= 30
  const totalsX = width - 200
  
  page.drawText('Subtotal:', { x: totalsX - 50, y: yPosition, size: 10, font })
  page.drawText(`$${data.subtotal.toFixed(2)}`, { x: totalsX + 50, y: yPosition, size: 10, font })
  
  if (data.discount && data.discount > 0) {
    yPosition -= 20
    page.drawText('Discount:', { x: totalsX - 50, y: yPosition, size: 10, font })
    page.drawText(`-$${data.discount.toFixed(2)}`, { x: totalsX + 50, y: yPosition, size: 10, font })
  }
  
  yPosition -= 20
  
  if (data.taxExempt) {
    page.drawText('Sales Tax:', { x: totalsX - 50, y: yPosition, size: 10, font })
    page.drawText('TAX EXEMPT', { x: totalsX + 30, y: yPosition, size: 10, font, color: rgb(0.8, 0, 0) })
    if (data.exemptionCertificate) {
      yPosition -= 15
      page.drawText(`Certificate: ${data.exemptionCertificate}`, { 
        x: totalsX - 50, y: yPosition, size: 8, font, color: rgb(0.5, 0.5, 0.5)
      })
    }
  } else {
    page.drawText(`Sales Tax (${(data.taxRate * 100).toFixed(2)}%):`, { 
      x: totalsX - 50, y: yPosition, size: 10, font 
    })
    page.drawText(`$${data.taxAmount.toFixed(2)}`, { x: totalsX + 50, y: yPosition, size: 10, font })
  }
  
  yPosition -= 25
  
  // Draw line
  page.drawLine({
    start: { x: totalsX - 60, y: yPosition + 15 },
    end: { x: width - 50, y: yPosition + 15 },
    thickness: 2,
    color: rgb(0, 0, 0)
  })
  
  page.drawText('TOTAL:', { x: totalsX - 50, y: yPosition, size: 12, font: fontBold })
  page.drawText(`$${data.total.toFixed(2)}`, { 
    x: totalsX + 50, y: yPosition, size: 12, font: fontBold 
  })
  
  // Payment Terms
  if (data.paymentTerms) {
    yPosition -= 40
    page.drawText('Payment Terms:', { x: 50, y: yPosition, size: 10, font: fontBold })
    yPosition -= 15
    page.drawText(data.paymentTerms, { x: 50, y: yPosition, size: 10, font })
  }
  
  // Notes
  if (data.notes) {
    yPosition -= 30
    page.drawText('Notes:', { x: 50, y: yPosition, size: 10, font: fontBold })
    yPosition -= 15
    
    // Wrap text if too long
    const maxWidth = width - 100
    const words = data.notes.split(' ')
    let line = ''
    
    words.forEach((word) => {
      const testLine = line + word + ' '
      const textWidth = font.widthOfTextAtSize(testLine, 10)
      
      if (textWidth > maxWidth && line !== '') {
        page.drawText(line.trim(), { x: 50, y: yPosition, size: 10, font })
        line = word + ' '
        yPosition -= 15
      } else {
        line = testLine
      }
    })
    
    if (line.trim() !== '') {
      page.drawText(line.trim(), { x: 50, y: yPosition, size: 10, font })
    }
  }
  
  // Footer
  page.drawText('Thank you for your business!', {
    x: width / 2 - 70,
    y: 40,
    size: 10,
    font: fontBold,
    color: rgb(0.4, 0.4, 0.4)
  })
  
  return await pdfDoc.save()
}

/**
 * Calcula el sales tax de Florida basado en el código postal
 */
export async function calculateFloridaSalesTax(zipCode: string, amount: number): Promise<{
  stateTax: number
  countyTax: number
  totalTax: number
  totalRate: number
}> {
  try {
    // Buscar la tasa de impuesto para el código postal
    const taxRate = await (prisma as any).salesTaxRate.findFirst({
      where: {
        zipCode: zipCode,
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      },
      orderBy: {
        effectiveDate: 'desc'
      }
    })
    
    if (taxRate) {
      const stateTax = amount * taxRate.stateTaxRate
      const countyTax = amount * (taxRate.countyTaxRate + taxRate.cityTaxRate + taxRate.specialTaxRate)
      const totalTax = stateTax + countyTax
      
      return {
        stateTax,
        countyTax,
        totalTax,
        totalRate: taxRate.totalTaxRate
      }
    }
    
    // Default Florida state tax (6%)
    const defaultStateTax = amount * 0.06
    return {
      stateTax: defaultStateTax,
      countyTax: 0,
      totalTax: defaultStateTax,
      totalRate: 0.06
    }
    
  } catch (error) {
    console.error('Error calculating sales tax:', error)
    // Return default 6% if error
    return {
      stateTax: amount * 0.06,
      countyTax: 0,
      totalTax: amount * 0.06,
      totalRate: 0.06
    }
  }
}

/**
 * Guarda la factura electrónica en la base de datos
 */
export async function saveEInvoice(invoiceId: string, pdfContent: Uint8Array) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true
    }
  })
  
  if (!invoice) {
    throw new Error('Invoice not found')
  }
  
  const pdfBase64 = Buffer.from(pdfContent).toString('base64')
  
  return await (prisma as any).eInvoice.create({
    data: {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      companyName: process.env.COMPANY_NAME || 'Company Name',
      companyEIN: process.env.COMPANY_EIN || '00-0000000',
      companyAddress: process.env.COMPANY_ADDRESS || '',
      companyCity: process.env.COMPANY_CITY || '',
      companyState: 'FL',
      companyZip: process.env.COMPANY_ZIP || '',
      companyPhone: process.env.COMPANY_PHONE,
      companyEmail: process.env.COMPANY_EMAIL,
      customerName: invoice.customer.name,
      customerTaxId: invoice.customer.taxId,
      customerAddress: invoice.customer.address || '',
      customerCity: invoice.customer.city || '',
      customerState: invoice.customer.state || 'FL',
      customerZip: invoice.customer.zipCode || '',
      customerEmail: invoice.customer.email,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      discountAmount: invoice.discount,
      taxableAmount: invoice.subtotal - invoice.discount,
      salesTaxRate: (invoice as any).salesTaxRate || 0.06,
      salesTaxAmount: invoice.taxAmount,
      totalAmount: invoice.total,
      pdfContent: pdfBase64,
      status: 'DRAFT'
    }
  })
}
