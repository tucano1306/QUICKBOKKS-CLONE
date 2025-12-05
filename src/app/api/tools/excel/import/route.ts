import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Palabras clave que indican que una fila es un encabezado, título o nota (no datos)
const HEADER_KEYWORDS = [
  'descripcion', 'description', 'cantidades', 'cantidad', 'total gastos', 
  'total ingresos', 'observaciones', 'notas', 'monto', 'amount', 'fecha',
  'date', 'pagos a', 'ganancias neta', 'gastos -ingresos', 'gastos-ingresos',
  'estos montos', 'basados a', 'encabezado', 'titulo', 'header', 'total',
  'subtotal', 'resumen', 'summary', 'semanal', 'semanales', 'mensual',
  'mensuales', 'nota:', 'importante', 'advertencia'
]

// Función para detectar si una fila es un encabezado/título/nota
function isHeaderOrTitleRow(row: Record<string, unknown>): boolean {
  const values = Object.values(row)
  
  // Contar cuántos valores son texto vs números
  let textCount = 0
  let numericCount = 0
  let nullCount = 0
  
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      nullCount++
      continue
    }
    
    const strValue = String(value).toLowerCase().trim()
    
    // Si es un número o parece un monto, contarlo
    const cleaned = strValue.replace(/[$€£¥,\s]/g, '')
    if (!isNaN(Number(cleaned)) && cleaned !== '') {
      numericCount++
    } else {
      textCount++
      
      // Verificar si contiene palabras clave de encabezado
      for (const keyword of HEADER_KEYWORDS) {
        if (strValue.includes(keyword.toLowerCase())) {
          return true
        }
      }
    }
  }
  
  // Si la mayoría son nulls o todo es texto sin números, probablemente es encabezado
  if (nullCount >= values.length - 1 && numericCount === 0) {
    return true
  }
  
  return false
}

// POST - Importar datos de Excel a la base de datos
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { type, data, mappings, companyId } = body

    if (!type || !data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Se requiere ID de empresa' }, { status: 400 })
    }

    // Verificar que la empresa existe y el usuario tiene acceso
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        users: { some: { userId: session.user.id } }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    let result: { imported: number; errors: string[] }

    switch (type) {
      case 'customers':
        result = await importCustomers(data, mappings, companyId)
        break
      case 'expenses':
        result = await importExpenses(data, mappings, companyId, session.user.id)
        break
      case 'income':
        result = await importIncome(data, mappings, companyId, session.user.id)
        break
      case 'products':
        result = await importProducts(data, mappings, companyId)
        break
      case 'invoices':
        result = await importInvoices(data, mappings, companyId, session.user.id)
        break
      case 'vendors':
        result = await importVendors(data, mappings, companyId)
        break
      default:
        return NextResponse.json({ error: 'Tipo de importación no soportado' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      imported: result.imported,
      errors: result.errors,
      message: `Se importaron ${result.imported} registros exitosamente`
    })

  } catch (error) {
    console.error('Error importing data:', error)
    return NextResponse.json({ 
      error: 'Error al importar datos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Importar Clientes
async function importCustomers(
  data: Record<string, unknown>[],
  mappings: Record<string, string>,
  companyId: string
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0
  const errors: string[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    try {
      const customerData = {
        companyId,
        name: getString(row, mappings, ['name', 'nombre', 'customer', 'cliente', 'company', 'empresa']),
        email: getString(row, mappings, ['email', 'correo', 'e-mail']),
        phone: getString(row, mappings, ['phone', 'telefono', 'teléfono', 'tel', 'mobile', 'celular']),
        address: getString(row, mappings, ['address', 'direccion', 'dirección', 'domicilio']),
        city: getString(row, mappings, ['city', 'ciudad']),
        state: getString(row, mappings, ['state', 'estado', 'provincia']),
        zipCode: getString(row, mappings, ['zip', 'zipcode', 'zip_code', 'codigo_postal', 'cp']),
        country: getString(row, mappings, ['country', 'pais', 'país']) || 'US',
        taxId: getString(row, mappings, ['tax_id', 'taxid', 'rfc', 'ein', 'nit', 'rut']),
        notes: getString(row, mappings, ['notes', 'notas', 'observaciones', 'comments'])
      }

      if (!customerData.name) {
        errors.push(`Fila ${i + 2}: Nombre requerido`)
        continue
      }

      // Verificar si ya existe por email o nombre
      const existing = await prisma.customer.findFirst({
        where: {
          companyId,
          OR: [
            customerData.email ? { email: customerData.email } : {},
            { name: customerData.name }
          ].filter(o => Object.keys(o).length > 0)
        }
      })

      if (existing) {
        // Actualizar existente
        await prisma.customer.update({
          where: { id: existing.id },
          data: customerData
        })
      } else {
        // Crear nuevo
        await prisma.customer.create({ data: customerData })
      }
      
      imported++
    } catch (error) {
      errors.push(`Fila ${i + 2}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  return { imported, errors }
}

// Importar Gastos
async function importExpenses(
  data: Record<string, unknown>[],
  mappings: Record<string, string>,
  companyId: string,
  userId: string
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0
  const errors: string[] = []

  // Obtener o crear categoría por defecto
  let defaultCategory = await prisma.expenseCategory.findFirst({
    where: { companyId, name: 'General' }
  })
  
  if (!defaultCategory) {
    defaultCategory = await prisma.expenseCategory.create({
      data: { 
        companyId, 
        name: 'General', 
        description: 'Categoría general',
        type: 'OTHER' // Campo requerido
      }
    })
  }

  // Mapeo de métodos de pago
  const paymentMethodMap: Record<string, 'CASH' | 'TRANSFER' | 'CARD' | 'CHECK' | 'OTHER'> = {
    'cash': 'CASH', 'efectivo': 'CASH', 'contado': 'CASH',
    'transfer': 'TRANSFER', 'transferencia': 'TRANSFER', 'wire': 'TRANSFER',
    'card': 'CARD', 'tarjeta': 'CARD', 'credit': 'CARD', 'credito': 'CARD', 'debit': 'CARD', 'debito': 'CARD',
    'check': 'CHECK', 'cheque': 'CHECK',
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    try {
      // Detectar y omitir filas que son encabezados/títulos/notas
      if (isHeaderOrTitleRow(row)) {
        // No agregar error, simplemente omitir silenciosamente
        continue
      }
      
      const description = getString(row, mappings, [
        'description', 'descripcion', 'descripción', 'concepto', 'detalle', 
        'memo', 'nota', 'notas', 'observacion', 'observaciones', 'motivo', 'razon',
        'pago', 'ingreso', 'gasto', 'egreso', 'mes', 'mes2', 'periodo', 'concepto',
        'pagos a cesar', 'pagos del seguro', 'pagos de la camioneta', 'ingresos mensuales'
      ])
      const amount = getNumber(row, mappings, [
        'amount', 'monto', 'total', 'importe', 'valor', 'precio', 'costo',
        'subtotal', 'neto', 'bruto', 'pago', 'cobro', 'gasto', 'egreso',
        'cantidad', 'cantidades', 'sum', 'suma', 'money', 'dinero', 'expense', 'cost',
        'total gastos', 'total ingresos', 'pagos', 'ingresos mensuales bruto',
        'pagos a cesar totales', 'pagos de la camioneta', 'pagos del seguro',
        'total ganancias', 'ganancias', 'ingresos', 'egresos', 'declarado'
      ], true) // allowZero = true
      const dateStr = getString(row, mappings, [
        'date', 'fecha', 'date_expense', 'fecha_gasto', 'dia', 'day',
        'fecha_pago', 'payment_date', 'created', 'creado', 'mes', 'mes2', 'semana',
        'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre',
        'diciembre', 'enero', 'febrero', 'marzo', 'abril', 'periodo', 'año'
      ])

      if (amount === undefined || amount === null) {
        // Mostrar valores de cada columna para debug
        const columnValues = Object.entries(row).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')
        errors.push(`Fila ${i + 2}: Monto no encontrado. Valores: ${columnValues.substring(0, 200)}`)
        continue
      }

      // Buscar categoría por nombre
      const categoryName = getString(row, mappings, ['category', 'categoria', 'categoría', 'tipo'])
      let categoryId = defaultCategory.id

      if (categoryName) {
        const category = await prisma.expenseCategory.findFirst({
          where: { companyId, name: { contains: categoryName, mode: 'insensitive' } }
        })
        if (category) categoryId = category.id
      }

      // Buscar vendor por nombre
      const vendorName = getString(row, mappings, ['vendor', 'proveedor', 'supplier', 'empresa'])

      const expenseDate = dateStr ? parseDate(dateStr) : new Date()
      
      // Obtener método de pago válido
      const paymentMethodStr = getString(row, mappings, ['payment_method', 'metodo_pago', 'forma_pago'])?.toLowerCase() || ''
      const paymentMethod = paymentMethodMap[paymentMethodStr] || 'OTHER'

      await prisma.expense.create({
        data: {
          companyId,
          userId,
          categoryId,
          vendor: vendorName,
          description: description || 'Gasto importado',
          amount,
          date: expenseDate,
          status: 'APPROVED',
          paymentMethod
        }
      })
      
      imported++
    } catch (error) {
      errors.push(`Fila ${i + 2}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  return { imported, errors }
}

// Importar Ingresos
async function importIncome(
  data: Record<string, unknown>[],
  mappings: Record<string, string>,
  companyId: string,
  userId: string
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0
  const errors: string[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    try {
      // Detectar y omitir filas que son encabezados/títulos/notas
      if (isHeaderOrTitleRow(row)) {
        // No agregar error, simplemente omitir silenciosamente
        continue
      }
      
      const description = getString(row, mappings, [
        'description', 'descripcion', 'descripción', 'concepto', 'detalle', 
        'servicio', 'tipo', 'ingreso', 'fuente', 'origen', 'mes', 'periodo'
      ])
      const amount = getNumber(row, mappings, [
        'amount', 'monto', 'total', 'importe', 'valor', 'precio',
        'ingresos', 'ingreso', 'cobro', 'venta', 'ganancias', 'ganancia',
        'cantidades', 'cantidad', 'ingresos mensuales bruto', 'total ingresos',
        'bruto', 'neto', 'revenue', 'income'
      ], true) // allowZero = true
      const dateStr = getString(row, mappings, [
        'date', 'fecha', 'mes', 'mes2', 'periodo', 'semana', 'año',
        'fecha_ingreso', 'fecha_pago', 'fecha_cobro'
      ])

      if (amount === undefined || amount === null) {
        // Mostrar valores de cada columna para debug
        const columnValues = Object.entries(row).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')
        errors.push(`Fila ${i + 2}: Monto no encontrado. Valores: ${columnValues.substring(0, 200)}`)
        continue
      }

      const customerName = getString(row, mappings, [
        'customer', 'cliente', 'client', 'pagador', 'de quien', 'origen', 'fuente'
      ])
      
      const category = getString(row, mappings, [
        'category', 'categoria', 'categoría', 'tipo', 'fuente', 'origen'
      ])

      const incomeDate = dateStr ? parseDate(dateStr) : new Date()

      // Crear como transacción de tipo INCOME
      await prisma.transaction.create({
        data: {
          companyId,
          type: 'INCOME',
          category: category || 'Ingreso General',
          description: description || 'Ingreso importado',
          amount,
          date: incomeDate,
          status: 'COMPLETED',
          notes: customerName ? `Cliente: ${customerName}` : undefined,
        }
      })
      
      imported++
    } catch (error) {
      errors.push(`Fila ${i + 2}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  return { imported, errors }
}

// Importar Productos
async function importProducts(
  data: Record<string, unknown>[],
  mappings: Record<string, string>,
  companyId: string
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0
  const errors: string[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    try {
      const name = getString(row, mappings, ['name', 'nombre', 'product', 'producto', 'item', 'articulo'])
      const price = getNumber(row, mappings, ['price', 'precio', 'unit_price', 'precio_unitario', 'valor'])
      
      if (!name) {
        errors.push(`Fila ${i + 2}: Nombre requerido`)
        continue
      }

      const productData = {
        companyId,
        name,
        description: getString(row, mappings, ['description', 'descripcion', 'descripción', 'detalle']),
        sku: getString(row, mappings, ['sku', 'codigo', 'código', 'code', 'barcode']),
        price: price || 0,
        cost: getNumber(row, mappings, ['cost', 'costo', 'purchase_price', 'precio_compra']),
        stockQuantity: getNumber(row, mappings, ['stock', 'quantity', 'cantidad', 'inventario', 'qty']) || 0,
        minStockLevel: getNumber(row, mappings, ['min_stock', 'stock_minimo', 'reorder_level']),
        unit: getString(row, mappings, ['unit', 'unidad', 'uom']) || 'unit',
        taxable: true,
        active: true
      }

      // Verificar si ya existe por SKU o nombre
      const existing = await prisma.product.findFirst({
        where: {
          companyId,
          OR: [
            productData.sku ? { sku: productData.sku } : {},
            { name: productData.name }
          ].filter(o => Object.keys(o).length > 0)
        }
      })

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: productData
        })
      } else {
        await prisma.product.create({ data: productData })
      }
      
      imported++
    } catch (error) {
      errors.push(`Fila ${i + 2}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  return { imported, errors }
}

// Importar Proveedores
async function importVendors(
  data: Record<string, unknown>[],
  mappings: Record<string, string>,
  companyId: string
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0
  const errors: string[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    try {
      const name = getString(row, mappings, ['name', 'nombre', 'vendor', 'proveedor', 'supplier', 'empresa'])
      
      if (!name) {
        errors.push(`Fila ${i + 2}: Nombre requerido`)
        continue
      }

      // Generar número de proveedor único
      const lastVendor = await prisma.vendor.findFirst({
        orderBy: { vendorNumber: 'desc' }
      })
      const nextNumber = lastVendor 
        ? String(parseInt(lastVendor.vendorNumber.replace(/\D/g, '') || '0') + 1).padStart(6, '0')
        : '000001'
      const vendorNumber = `VND-${nextNumber}`

      const vendorData = {
        companyId,
        vendorNumber,
        name,
        email: getString(row, mappings, ['email', 'correo', 'e-mail']) || null,
        phone: getString(row, mappings, ['phone', 'telefono', 'teléfono', 'tel']) || null,
        address: getString(row, mappings, ['address', 'direccion', 'dirección']) || null,
        city: getString(row, mappings, ['city', 'ciudad']) || null,
        state: getString(row, mappings, ['state', 'estado']) || null,
        country: getString(row, mappings, ['country', 'pais', 'país']) || 'US',
        taxId: getString(row, mappings, ['tax_id', 'taxid', 'rfc', 'ein']) || null,
        notes: getString(row, mappings, ['notes', 'notas', 'observaciones']) || null
      }

      const existing = await prisma.vendor.findFirst({
        where: { companyId, name: vendorData.name }
      })

      if (existing) {
        await prisma.vendor.update({
          where: { id: existing.id },
          data: {
            ...vendorData,
            vendorNumber: existing.vendorNumber // Mantener número existente
          }
        })
      } else {
        await prisma.vendor.create({ data: vendorData })
      }
      
      imported++
    } catch (error) {
      errors.push(`Fila ${i + 2}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  return { imported, errors }
}

// Importar Facturas (básico)
async function importInvoices(
  data: Record<string, unknown>[],
  mappings: Record<string, string>,
  companyId: string,
  userId: string
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0
  const errors: string[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    try {
      const customerName = getString(row, mappings, ['customer', 'cliente', 'client', 'nombre_cliente'])
      const total = getNumber(row, mappings, ['total', 'amount', 'monto', 'importe'])
      const dateStr = getString(row, mappings, ['date', 'fecha', 'invoice_date', 'fecha_factura'])

      if (!total || total <= 0) {
        errors.push(`Fila ${i + 2}: Total inválido o requerido`)
        continue
      }

      // Buscar o crear cliente
      let customerId: string | undefined

      if (customerName) {
        let customer = await prisma.customer.findFirst({
          where: { companyId, name: { contains: customerName, mode: 'insensitive' } }
        })
        
        if (!customer) {
          customer = await prisma.customer.create({
            data: { companyId, name: customerName }
          })
        }
        customerId = customer.id
      }

      if (!customerId) {
        errors.push(`Fila ${i + 2}: Cliente requerido`)
        continue
      }

      const invoiceDate = dateStr ? parseDate(dateStr) : new Date()
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + 30)

      // Generar número de factura
      const lastInvoice = await prisma.invoice.findFirst({
        where: { companyId },
        orderBy: { invoiceNumber: 'desc' }
      })
      const nextNumber = lastInvoice 
        ? String(parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '') || '0') + 1).padStart(6, '0')
        : '000001'

      await prisma.invoice.create({
        data: {
          companyId,
          customerId,
          userId,
          invoiceNumber: `INV-${nextNumber}`,
          issueDate: invoiceDate,
          dueDate,
          subtotal: total,
          taxAmount: 0,
          total,
          status: 'SENT',
          notes: getString(row, mappings, ['notes', 'notas', 'observaciones']) || 'Importada desde Excel'
        }
      })
      
      imported++
    } catch (error) {
      errors.push(`Fila ${i + 2}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  return { imported, errors }
}

// Funciones auxiliares
function getString(
  row: Record<string, unknown>,
  mappings: Record<string, string>,
  possibleKeys: string[]
): string | undefined {
  // Primero buscar en mappings (si el usuario mapeó columnas específicas)
  for (const [excelCol, mappedTo] of Object.entries(mappings)) {
    if (possibleKeys.some(pk => pk.toLowerCase() === mappedTo.toLowerCase())) {
      const value = row[excelCol]
      if (value !== null && value !== undefined && value !== '') {
        return String(value).trim()
      }
    }
  }
  
  // Luego buscar directamente en row por nombre de columna
  for (const rowKey of Object.keys(row)) {
    const rowKeyLower = rowKey.toLowerCase().replace(/[^a-z0-9áéíóúñ]/gi, '')
    
    for (const key of possibleKeys) {
      const keyLower = key.toLowerCase().replace(/[^a-z0-9áéíóúñ]/gi, '')
      
      // Coincidencia exacta o parcial
      if (rowKeyLower === keyLower || 
          rowKeyLower.includes(keyLower) || 
          keyLower.includes(rowKeyLower)) {
        const value = row[rowKey]
        if (value !== null && value !== undefined && value !== '') {
          return String(value).trim()
        }
      }
    }
  }
  
  // Si no encontramos por nombre, buscar en columnas __EMPTY que tengan texto
  // (para archivos Excel mal formateados sin encabezados claros)
  const textColumns: { key: string; value: string }[] = []
  
  for (const rowKey of Object.keys(row)) {
    // Solo considerar columnas con nombres genéricos
    if (rowKey.startsWith('__EMPTY') || rowKey.includes('EMPTY')) {
      const value = row[rowKey]
      if (value !== null && value !== undefined && value !== '') {
        const strValue = String(value).trim()
        // Solo texto, no números puros
        if (strValue && isNaN(Number(strValue.replace(/[$€£¥,\s]/g, '')))) {
          textColumns.push({ key: rowKey, value: strValue })
        }
      }
    }
  }
  
  // Si encontramos columnas con texto, devolver la primera que no sea vacía
  if (textColumns.length > 0) {
    return textColumns[0].value
  }
  
  return undefined
}

function getNumber(
  row: Record<string, unknown>,
  mappings: Record<string, string>,
  possibleKeys: string[],
  allowZero: boolean = false
): number | undefined {
  // Primero intentar con getString
  const str = getString(row, mappings, possibleKeys)
  if (str) {
    const cleaned = str.replace(/[$€£¥,\s]/g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    if (!isNaN(num) && (allowZero || num > 0)) return num
  }
  
  // Si no funciona, buscar directamente valores numéricos en la row
  for (const rowKey of Object.keys(row)) {
    const rowKeyLower = rowKey.toLowerCase().replace(/[^a-z0-9áéíóúñ]/gi, '')
    
    for (const key of possibleKeys) {
      const keyLower = key.toLowerCase().replace(/[^a-z0-9áéíóúñ]/gi, '')
      
      if (rowKeyLower === keyLower || 
          rowKeyLower.includes(keyLower) || 
          keyLower.includes(rowKeyLower)) {
        const value = row[rowKey]
        
        // Si ya es número, devolverlo
        if (typeof value === 'number' && !isNaN(value) && (allowZero || value > 0)) {
          return value
        }
        
        // Si es string, intentar convertir
        if (value !== null && value !== undefined && value !== '') {
          const cleaned = String(value).replace(/[$€£¥,\s]/g, '').replace(',', '.')
          const num = parseFloat(cleaned)
          if (!isNaN(num) && (allowZero || num > 0)) return num
        }
      }
    }
  }
  
  // Buscar en columnas con nombres genéricos (__EMPTY, __EMPTY_1, etc.)
  // que contengan valores numéricos
  const numericValues: { key: string; value: number }[] = []
  
  for (const rowKey of Object.keys(row)) {
    const value = row[rowKey]
    
    // Si ya es número positivo (o cero si se permite)
    if (typeof value === 'number' && !isNaN(value) && (allowZero || value > 0)) {
      numericValues.push({ key: rowKey, value })
      continue
    }
    
    // Si es string que parece número
    if (value !== null && value !== undefined && value !== '') {
      const strValue = String(value).trim()
      // Limpiar símbolos de moneda y separadores
      const cleaned = strValue.replace(/[$€£¥,\s]/g, '').replace(',', '.')
      const num = parseFloat(cleaned)
      if (!isNaN(num) && (allowZero || num > 0)) {
        numericValues.push({ key: rowKey, value: num })
      }
    }
  }
  
  // Si encontramos valores numéricos, devolver el más probable (el mayor o el único)
  if (numericValues.length === 1) {
    return numericValues[0].value
  }
  
  if (numericValues.length > 1) {
    // Priorizar columnas que parezcan montos (valores más grandes típicamente)
    // Ordenar por valor descendente y devolver el mayor
    numericValues.sort((a, b) => b.value - a.value)
    return numericValues[0].value
  }
  
  return undefined
}

function parseDate(dateStr: string): Date {
  // Intentar varios formatos
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY o DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // D/M/YY o D/M/YYYY
  ]
  
  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date
      }
    }
  }
  
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? new Date() : date
}
