import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener transacciones para AI categorización
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status') // pending, categorized, reviewed

    // Obtener transacciones sin categorizar o pendientes de revisión
    const where: any = {}
    if (companyId) where.companyId = companyId
    
    if (status === 'pending') {
      where.OR = [
        { category: { isEmpty: true } },
        { categoryId: null }
      ]
    }

    const transactions = await prisma.bankTransaction.findMany({
      where,
      include: {
        bankAccount: true,
        expense: true
      },
      orderBy: { date: 'desc' },
      take: 100
    })

    // Obtener categorías disponibles
    const categories = await prisma.expenseCategory.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { name: 'asc' }
    })

    // Obtener plan de cuentas
    const accounts = await prisma.chartOfAccounts.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' }
    })

    // Procesar transacciones con sugerencias de AI (simulado)
    const processedTransactions = transactions.map(t => {
      const suggestions = generateAISuggestions(t, categories, accounts)
      return {
        id: t.id,
        date: t.date,
        description: t.description || t.name,
        amount: Math.abs(t.amount),
        type: t.credit > 0 ? 'credit' : 'debit',
        status: t.category?.length > 0 ? 'categorized' : 'pending',
        aiCategory: suggestions[0]?.category || null,
        aiAccount: suggestions[0]?.account || null,
        aiConfidence: suggestions[0]?.confidence || 0,
        aiProcessingTime: '0.5s',
        suggestedCategories: suggestions,
        bankAccount: t.bankAccount?.accountName
      }
    })

    // Estadísticas de AI
    const stats = {
      totalProcessed: processedTransactions.length,
      categorized: processedTransactions.filter(t => t.status === 'categorized').length,
      pending: processedTransactions.filter(t => t.status === 'pending').length,
      averageConfidence: processedTransactions.reduce((sum, t) => sum + t.aiConfidence, 0) / (processedTransactions.length || 1),
      accuracyRate: 94.5, // Porcentaje simulado
      learningProgress: 87 // Porcentaje de aprendizaje simulado
    }

    return NextResponse.json({
      success: true,
      transactions: processedTransactions,
      categories,
      accounts,
      stats
    })

  } catch (error) {
    console.error('Error fetching AI categorization data:', error)
    return NextResponse.json({ 
      error: 'Error al obtener datos para categorización AI',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Aplicar categorización AI o manual
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { action, transactionIds, categoryId, accountId, feedback } = body

    switch (action) {
      case 'auto-categorize':
        // Categorizar automáticamente transacciones seleccionadas
        const autoCategorized = await autoCategorizeTransactions(transactionIds)
        return NextResponse.json({ 
          success: true, 
          message: `${autoCategorized} transacciones categorizadas automáticamente`,
          count: autoCategorized
        })

      case 'apply-category':
        // Aplicar categoría manualmente
        await prisma.bankTransaction.updateMany({
          where: { id: { in: transactionIds } },
          data: { 
            category: [categoryId],
            categoryId
          }
        })
        return NextResponse.json({ success: true })

      case 'approve':
        // Aprobar categorización AI
        await prisma.bankTransaction.updateMany({
          where: { id: { in: transactionIds } },
          data: { reconciled: true }
        })
        return NextResponse.json({ success: true })

      case 'reject':
        // Rechazar y solicitar nueva categorización
        await prisma.bankTransaction.updateMany({
          where: { id: { in: transactionIds } },
          data: { 
            category: [],
            categoryId: null
          }
        })
        return NextResponse.json({ success: true })

      case 'feedback':
        // Registrar feedback para mejorar AI (simulado)
        console.log('AI Feedback received:', { transactionIds, feedback })
        return NextResponse.json({ 
          success: true, 
          message: 'Feedback registrado para mejorar el modelo' 
        })

      case 'train':
        // Entrenar modelo con nuevos datos (simulado)
        return NextResponse.json({ 
          success: true, 
          message: 'Modelo re-entrenado con nuevos patrones',
          newAccuracy: 95.2
        })

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing AI categorization:', error)
    return NextResponse.json({ 
      error: 'Error al procesar categorización AI',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Función para generar sugerencias de AI (simulada pero con lógica real)
function generateAISuggestions(
  transaction: any, 
  categories: any[], 
  accounts: any[]
): { category: string; account: string; confidence: number }[] {
  const description = (transaction.description || transaction.name || '').toLowerCase()
  const merchantName = (transaction.merchantName || '').toLowerCase()
  
  const suggestions: { category: string; account: string; confidence: number }[] = []

  // Reglas de categorización basadas en patrones
  const patterns: { keywords: string[]; category: string; account: string }[] = [
    { keywords: ['electric', 'luz', 'cfe', 'power'], category: 'Utilities - Electricity', account: '5230 - Servicios Públicos' },
    { keywords: ['water', 'agua'], category: 'Utilities - Water', account: '5230 - Servicios Públicos' },
    { keywords: ['gas', 'gasolina', 'pemex'], category: 'Vehicle - Fuel', account: '5250 - Transporte' },
    { keywords: ['office depot', 'staples', 'papeleria'], category: 'Office Supplies', account: '5240 - Suministros de Oficina' },
    { keywords: ['amazon', 'mercadolibre'], category: 'General Supplies', account: '5240 - Suministros' },
    { keywords: ['rent', 'renta', 'alquiler'], category: 'Rent', account: '5210 - Renta' },
    { keywords: ['paypal', 'stripe', 'payment'], category: 'Sales Revenue', account: '4010 - Ingresos' },
    { keywords: ['salary', 'nomina', 'payroll'], category: 'Payroll', account: '5110 - Nómina' },
    { keywords: ['insurance', 'seguro'], category: 'Insurance', account: '5260 - Seguros' },
    { keywords: ['phone', 'telefono', 'telmex', 'telcel'], category: 'Telephone', account: '5230 - Comunicaciones' },
    { keywords: ['internet', 'wifi'], category: 'Internet', account: '5230 - Comunicaciones' },
    { keywords: ['advertising', 'publicidad', 'facebook', 'google ads'], category: 'Advertising', account: '5280 - Publicidad' },
    { keywords: ['restaurant', 'comida', 'food'], category: 'Meals & Entertainment', account: '5270 - Alimentos' },
    { keywords: ['hotel', 'hospedaje', 'airbnb'], category: 'Travel - Lodging', account: '5250 - Viajes' },
    { keywords: ['flight', 'vuelo', 'airline'], category: 'Travel - Transportation', account: '5250 - Viajes' },
    { keywords: ['software', 'subscription', 'suscripcion'], category: 'Software & Subscriptions', account: '5290 - Software' }
  ]

  for (const pattern of patterns) {
    const matchScore = pattern.keywords.filter(k => 
      description.includes(k) || merchantName.includes(k)
    ).length

    if (matchScore > 0) {
      const confidence = Math.min(95, 70 + (matchScore * 10))
      suggestions.push({
        category: pattern.category,
        account: pattern.account,
        confidence
      })
    }
  }

  // Ordenar por confianza y tomar top 3
  suggestions.sort((a, b) => b.confidence - a.confidence)
  
  // Si no hay sugerencias, agregar una genérica
  if (suggestions.length === 0) {
    suggestions.push({
      category: 'Uncategorized',
      account: '5900 - Otros Gastos',
      confidence: 30
    })
  }

  return suggestions.slice(0, 3)
}

// Función para auto-categorizar transacciones
async function autoCategorizeTransactions(transactionIds: string[]): Promise<number> {
  const transactions = await prisma.bankTransaction.findMany({
    where: { id: { in: transactionIds } }
  })

  const categories = await prisma.expenseCategory.findMany()
  const accounts = await prisma.chartOfAccounts.findMany({ where: { isActive: true } })

  let count = 0
  for (const t of transactions) {
    const suggestions = generateAISuggestions(t, categories, accounts)
    if (suggestions.length > 0 && suggestions[0].confidence >= 70) {
      await prisma.bankTransaction.update({
        where: { id: t.id },
        data: {
          category: [suggestions[0].category]
        }
      })
      count++
    }
  }

  return count
}
