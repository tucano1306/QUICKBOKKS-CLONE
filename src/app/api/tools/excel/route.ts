import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

// Tipos
interface ExcelSheet {
  name: string
  data: Record<string, unknown>[]
  headers: string[]
  rowCount: number
  colCount: number
}

interface ExcelFile {
  fileName: string
  sheets: ExcelSheet[]
  totalRows: number
}

interface ExcelAnalysis {
  summary: {
    totalRows: number
    totalColumns: number
    dataTypes: Record<string, number>
  }
  columns: {
    name: string
    type: string
    uniqueValues: number
    nullCount: number
    sampleValues: unknown[]
  }[]
  numericStats: {
    column: string
    min: number
    max: number
    sum: number
    avg: number
    count: number
  }[]
}

// POST - Procesar archivo Excel
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Validar tipo de archivo
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json({ error: 'Tipo de archivo no válido' }, { status: 400 })
    }

    // Leer archivo
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    
    // Procesar hojas
    const sheets: ExcelSheet[] = workbook.SheetNames.map(sheetName => {
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { 
        defval: null,
        raw: false 
      })
      
      const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : []
      
      return {
        name: sheetName,
        data: jsonData,
        headers,
        rowCount: jsonData.length,
        colCount: headers.length
      }
    })

    const excelFile: ExcelFile = {
      fileName: file.name,
      sheets,
      totalRows: sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0)
    }

    // Analizar primera hoja
    let analysis: ExcelAnalysis | null = null
    if (sheets.length > 0) {
      analysis = analyzeSheet(sheets[0])
    }

    // Detectar tipo de datos
    const detectedType = sheets.length > 0 ? detectFinancialData(sheets[0]) : null

    return NextResponse.json({
      success: true,
      file: excelFile,
      analysis,
      detectedType
    })

  } catch (error) {
    console.error('Error processing Excel:', error)
    return NextResponse.json({ error: 'Error al procesar el archivo' }, { status: 500 })
  }
}

// Función para analizar hoja
function analyzeSheet(sheet: ExcelSheet): ExcelAnalysis {
  const { data, headers } = sheet
  
  const columnAnalysis = headers.map(header => {
    const values = data.map(row => row[header])
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '')
    
    const types = { number: 0, string: 0, date: 0, boolean: 0 }
    
    nonNullValues.forEach(value => {
      if (typeof value === 'number' || (!isNaN(Number(value)) && value !== '')) {
        types.number++
      } else if (value instanceof Date || isValidDate(String(value))) {
        types.date++
      } else if (typeof value === 'boolean' || value === 'true' || value === 'false') {
        types.boolean++
      } else {
        types.string++
      }
    })
    
    const maxType = Object.entries(types).reduce((a, b) => a[1] > b[1] ? a : b)
    const isMixed = Object.values(types).filter(v => v > 0).length > 1
    
    return {
      name: header,
      type: isMixed ? 'mixed' : maxType[0],
      uniqueValues: new Set(nonNullValues.map(v => String(v))).size,
      nullCount: values.length - nonNullValues.length,
      sampleValues: nonNullValues.slice(0, 5)
    }
  })
  
  const numericStats = columnAnalysis
    .filter(col => col.type === 'number')
    .map(col => {
      const values = data
        .map(row => row[col.name])
        .filter(v => v !== null && v !== undefined && v !== '')
        .map(v => Number(v))
        .filter(v => !isNaN(v))
      
      if (values.length === 0) return null
      
      return {
        column: col.name,
        min: Math.min(...values),
        max: Math.max(...values),
        sum: values.reduce((a, b) => a + b, 0),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length
      }
    })
    .filter(Boolean) as ExcelAnalysis['numericStats']
  
  const dataTypes: Record<string, number> = {}
  columnAnalysis.forEach(col => {
    dataTypes[col.type] = (dataTypes[col.type] || 0) + 1
  })
  
  return {
    summary: {
      totalRows: data.length,
      totalColumns: headers.length,
      dataTypes
    },
    columns: columnAnalysis,
    numericStats
  }
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime()) && dateString.includes('/')
}

function detectFinancialData(sheet: ExcelSheet) {
  const { headers } = sheet
  
  const patterns: Record<string, string[]> = {
    invoices: ['invoice', 'factura', 'total', 'client', 'cliente', 'amount', 'monto', 'date', 'fecha', 'due'],
    expenses: ['expense', 'gasto', 'vendor', 'proveedor', 'category', 'categoría', 'amount', 'receipt'],
    customers: ['customer', 'cliente', 'name', 'nombre', 'email', 'phone', 'address', 'dirección'],
    products: ['product', 'producto', 'sku', 'price', 'precio', 'stock', 'quantity', 'cantidad'],
    transactions: ['transaction', 'transacción', 'debit', 'credit', 'balance', 'account', 'cuenta']
  }
  
  let bestMatch = { type: 'unknown', score: 0, mappings: {} as Record<string, string> }
  
  for (const [type, keywords] of Object.entries(patterns)) {
    let score = 0
    const mappings: Record<string, string> = {}
    
    keywords.forEach(keyword => {
      const matchedHeader = headers.find(h => h.toLowerCase().includes(keyword))
      if (matchedHeader) {
        score++
        mappings[matchedHeader] = keyword
      }
    })
    
    if (score > bestMatch.score) {
      bestMatch = { type, score, mappings }
    }
  }
  
  return {
    type: bestMatch.type,
    confidence: Math.min(100, Math.round((bestMatch.score / 5) * 100)),
    mappings: bestMatch.mappings
  }
}
