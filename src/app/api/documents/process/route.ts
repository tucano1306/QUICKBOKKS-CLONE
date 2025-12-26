import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simulación de procesamiento con IA
// En producción, esto usaría:
// - Tesseract.js o Google Vision API para OCR
// - OpenAI GPT-4 Vision para análisis de documentos
// - TensorFlow.js para categorización ML
// - PDF.js para parsing de PDFs

interface DocumentAnalysis {
  documentType: 'invoice' | 'receipt' | 'bank_statement' | 'tax_document' | 'contract' | 'other'
  confidence: number
  extractedData: {
    amount?: number
    date?: string
    vendor?: string
    invoiceNumber?: string
    taxId?: string
    description?: string
  }
  accountCode?: string
  accountName?: string
  category: string
  journalEntry?: {
    debit: { account: string; amount: number }
    credit: { account: string; amount: number }
  }
  processingTime: number
  ocrText?: string
}

// Simulación de OCR
function simulateOCR(filename: string): string {
  const lowerFilename = filename.toLowerCase()
  
  if (lowerFilename.includes('factura') || lowerFilename.includes('invoice')) {
    return `
      FACTURA / INVOICE
      Número: FAC-2025-1234
      Fecha: 2025-11-25
      
      Proveedor: Acme Supplies Corp
      RFC/Tax ID: ABC123456789
      
      Descripción: Suministros de oficina diversos
      Subtotal: $850.00
      IVA (16%): $136.00
      Total: $986.00
      
      Método de Pago: Transferencia
      Cuenta: BBVA **** 5678
    `
  }
  
  if (lowerFilename.includes('recibo') || lowerFilename.includes('receipt')) {
    return `
      RECIBO / RECEIPT
      Fecha: 2025-11-25
      
      Establecimiento: QuickMart Store #42
      Dirección: 123 Main St, Miami FL
      
      Artículos:
      - Papel A4 x 5: $45.00
      - Bolígrafos x 20: $18.00
      - Grapadora: $12.50
      
      Subtotal: $75.50
      Tax (7%): $5.29
      Total: $80.79
      
      Pago: VISA **** 4532
    `
  }
  
  if (lowerFilename.includes('estado') || lowerFilename.includes('statement')) {
    return `
      ESTADO DE CUENTA BANCARIO
      Bank of America
      Cuenta: ****5678
      Periodo: 01/10/2025 - 31/10/2025
      
      Saldo Inicial: $45,890.50
      
      Depósitos: $125,450.00
      Retiros: $98,340.50
      Cargos: $85.00
      
      Saldo Final: $72,915.00
    `
  }
  
  return `Documento genérico - Texto extraído por OCR`
}

// Simulación de análisis con ML/IA
function analyzeDocument(filename: string, ocrText: string): DocumentAnalysis {
  const startTime = Date.now()
  const lowerFilename = filename.toLowerCase()
  const lowerText = ocrText.toLowerCase()
  
  let documentType: DocumentAnalysis['documentType'] = 'other'
  let confidence = 85
  let extractedData: DocumentAnalysis['extractedData'] = {}
  let accountCode = ''
  let accountName = ''
  let category = ''
  let journalEntry
  
  // Clasificación por palabras clave
  if (lowerFilename.includes('factura') || lowerText.includes('invoice') || lowerText.includes('factura')) {
    documentType = 'invoice'
    confidence = 97
    
    // Extraer datos
    const amountMatch = ocrText.match(/total[:\s]*\$?([\d,]+\.?\d*)/i)
    const dateMatch = ocrText.match(/fecha[:\s]*([\d]{4}-[\d]{2}-[\d]{2})/i)
    const vendorMatch = ocrText.match(/proveedor[:\s]*([^\n]+)/i)
    const invoiceMatch = ocrText.match(/n[uú]mero[:\s]*([A-Z0-9-]+)/i)
    
    extractedData = {
      amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 986.00,
      date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
      vendor: vendorMatch ? vendorMatch[1].trim() : 'Acme Supplies Corp',
      invoiceNumber: invoiceMatch ? invoiceMatch[1] : 'FAC-2025-1234'
    }
    
    // Asignar cuenta contable
    if (lowerText.includes('suministro') || lowerText.includes('supplies')) {
      accountCode = '5240'
      accountName = 'Suministros de Oficina'
      category = 'Gastos Operativos - Suministros'
    } else if (lowerText.includes('servicio') || lowerText.includes('service')) {
      accountCode = '5230'
      accountName = 'Servicios Públicos'
      category = 'Gastos Operativos - Servicios'
    } else {
      accountCode = '5200'
      accountName = 'Gastos Operativos'
      category = 'Gastos Generales'
    }
    
    // Crear asiento contable (partida doble)
    journalEntry = {
      debit: { account: `${accountCode} - ${accountName}`, amount: extractedData.amount || 0 },
      credit: { account: '2110 - Cuentas por Pagar', amount: extractedData.amount || 0 }
    }
    
  } else if (lowerFilename.includes('recibo') || lowerText.includes('receipt') || lowerText.includes('recibo')) {
    documentType = 'receipt'
    confidence = 94
    
    const amountMatch = ocrText.match(/total[:\s]*\$?([\d,]+\.?\d*)/i)
    const dateMatch = ocrText.match(/fecha[:\s]*([\d]{4}-[\d]{2}-[\d]{2})/i)
    const vendorMatch = ocrText.match(/establecimiento[:\s]*([^\n]+)/i)
    
    extractedData = {
      amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 80.79,
      date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
      vendor: vendorMatch ? vendorMatch[1].trim() : 'QuickMart Store',
      description: 'Compra de suministros varios'
    }
    
    accountCode = '5240'
    accountName = 'Suministros de Oficina'
    category = 'Gastos Operativos - Compras Menores'
    
    journalEntry = {
      debit: { account: `${accountCode} - ${accountName}`, amount: extractedData.amount || 0 },
      credit: { account: '1120 - Bancos', amount: extractedData.amount || 0 }
    }
    
  } else if (lowerFilename.includes('estado') || lowerFilename.includes('statement') || lowerText.includes('estado de cuenta')) {
    documentType = 'bank_statement'
    confidence = 99
    
    const balanceMatch = ocrText.match(/saldo final[:\s]*\$?([\d,]+\.?\d*)/i)
    const periodMatch = ocrText.match(/periodo[:\s]*([^\n]+)/i)
    
    extractedData = {
      amount: balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : 72915.00,
      date: new Date().toISOString().split('T')[0],
      description: periodMatch ? periodMatch[1].trim() : 'Estado de cuenta mensual'
    }
    
    accountCode = '1120'
    accountName = 'Bancos'
    category = 'Activos - Conciliación Bancaria'
    
    // No se crea asiento automático para estados de cuenta
    journalEntry = undefined
    
  } else if (lowerFilename.includes('tax') || lowerFilename.includes('1099') || lowerFilename.includes('w2')) {
    documentType = 'tax_document'
    confidence = 100
    
    accountCode = '9999'
    accountName = 'Documentos Fiscales'
    category = 'Tax - Archivo Anual'
    
  } else if (lowerFilename.includes('contrato') || lowerFilename.includes('contract')) {
    documentType = 'contract'
    confidence = 95
    
    accountCode = 'N/A'
    accountName = 'Documentos Legales'
    category = 'Legal - Contratos'
  }
  
  const processingTime = Date.now() - startTime
  
  return {
    documentType,
    confidence,
    extractedData,
    accountCode,
    accountName,
    category,
    journalEntry,
    processingTime,
    ocrText
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Simulación: En producción aquí se procesaría el archivo real
    // const buffer = await file.arrayBuffer()
    // const ocrText = await performOCR(buffer) // Tesseract.js o Google Vision
    // const analysis = await analyzeWithAI(ocrText) // OpenAI GPT-4 o modelo custom
    
    // Por ahora, simulamos el OCR y análisis
    const ocrText = simulateOCR(file.name)
    const analysis = analyzeDocument(file.name, ocrText)
    
    // En producción, aquí se guardaría en la base de datos
    // await prisma.document.create({...})
    // if (analysis.journalEntry) {
    //   await prisma.journalEntry.create({...})
    //   await updateAccountBalances(...)
    // }
    
    return NextResponse.json({
      success: true,
      filename: file.name,
      fileSize: file.size,
      fileType: file.type,
      analysis,
      message: 'Documento procesado exitosamente con IA'
    })
    
  } catch (error) {
    console.error('Error processing document:', error)
    return NextResponse.json(
      { error: 'Error processing document' },
      { status: 500 }
    )
  }
}

// Endpoint para procesar múltiples archivos
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }
    
    const results = []
    
    for (const file of files) {
      const ocrText = simulateOCR(file.name)
      const analysis = analyzeDocument(file.name, ocrText)
      
      results.push({
        filename: file.name,
        fileSize: file.size,
        analysis
      })
    }
    
    return NextResponse.json({
      success: true,
      processedCount: files.length,
      results,
      message: `${files.length} documentos procesados exitosamente`
    })
    
  } catch (error) {
    console.error('Error processing documents:', error)
    return NextResponse.json(
      { error: 'Error processing documents' },
      { status: 500 }
    )
  }
}
