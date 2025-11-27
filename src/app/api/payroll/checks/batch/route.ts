import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Imprimir lote de cheques
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await req.json()
    const { checkIds, action } = data

    if (!checkIds || checkIds.length === 0) {
      return NextResponse.json({ error: 'No se seleccionaron cheques' }, { status: 400 })
    }

    // Obtener empleados del usuario para verificar propiedad
    const employees = await (prisma as any).employee.findMany({
      where: { userId: session.user.id },
      select: { id: true }
    })
    const employeeIds = employees.map((e: any) => e.id)

    // Obtener cheques a procesar
    const checks = await (prisma as any).payrollCheck.findMany({
      where: {
        id: { in: checkIds },
        employeeId: { in: employeeIds }
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            address: true,
            bankAccount: true
          }
        }
      }
    })

    if (checks.length === 0) {
      return NextResponse.json({ error: 'No se encontraron cheques válidos' }, { status: 404 })
    }

    const results: any[] = []
    const errors: any[] = []

    for (const check of checks) {
      try {
        let updateData: any = {}
        
        switch (action) {
          case 'print':
            if (check.status === 'VOIDED') {
              errors.push({ id: check.id, checkNumber: check.checkNumber, error: 'Cheque anulado' })
              continue
            }
            updateData = { status: 'PRINTED', printedAt: new Date() }
            break
          case 'issue':
            if (check.status !== 'PRINTED') {
              errors.push({ id: check.id, checkNumber: check.checkNumber, error: 'Debe imprimir primero' })
              continue
            }
            updateData = { status: 'ISSUED' }
            break
          case 'void':
            updateData = { status: 'VOIDED', voidedAt: new Date(), voidReason: 'Anulación en lote' }
            break
          default:
            continue
        }

        const updated = await (prisma as any).payrollCheck.update({
          where: { id: check.id },
          data: updateData
        })

        results.push({
          id: check.id,
          checkNumber: check.checkNumber,
          employee: `${check.employee.firstName} ${check.employee.lastName}`,
          amount: check.amount,
          newStatus: updated.status
        })
      } catch (e: any) {
        errors.push({ id: check.id, checkNumber: check.checkNumber, error: e.message })
      }
    }

    // Generar datos para impresión si la acción es print
    let printData = null
    if (action === 'print' && results.length > 0) {
      printData = results.map(r => {
        const check = checks.find((c: any) => c.id === r.id)
        return {
          checkNumber: r.checkNumber,
          date: new Date().toLocaleDateString('es-ES'),
          payTo: `${check.employee.firstName} ${check.employee.lastName}`,
          amount: r.amount,
          amountInWords: numberToWords(r.amount),
          memo: check.memo || 'Pago de Nómina',
          address: check.employee.address || ''
        }
      })
    }

    return NextResponse.json({
      success: true,
      action,
      processed: results.length,
      failed: errors.length,
      results,
      errors,
      printData,
      totalAmount: results.reduce((sum, r) => sum + r.amount, 0)
    })
  } catch (error: any) {
    console.error('Error in batch check operation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Convertir número a palabras (español)
function numberToWords(num: number): string {
  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
  const tens = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve']
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

  if (num === 0) return 'cero'

  const intPart = Math.floor(num)
  const decPart = Math.round((num - intPart) * 100)

  let result = ''

  if (intPart >= 1000000) {
    const millions = Math.floor(intPart / 1000000)
    result += (millions === 1 ? 'un millón ' : convertHundreds(millions) + ' millones ')
  }

  const thousands = Math.floor((intPart % 1000000) / 1000)
  if (thousands > 0) {
    result += (thousands === 1 ? 'mil ' : convertHundreds(thousands) + ' mil ')
  }

  const remainder = intPart % 1000
  if (remainder > 0 || result === '') {
    result += convertHundreds(remainder)
  }

  result = result.trim() + ' dólares'

  if (decPart > 0) {
    result += ` con ${decPart}/100`
  }

  return result.charAt(0).toUpperCase() + result.slice(1)

  function convertHundreds(n: number): string {
    if (n === 0) return ''
    if (n === 100) return 'cien'
    
    let str = ''
    if (n >= 100) {
      str += hundreds[Math.floor(n / 100)] + ' '
      n %= 100
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)]
      if (n % 10 > 0) str += ' y ' + units[n % 10]
    } else if (n >= 10) {
      str += teens[n - 10]
    } else if (n > 0) {
      str += units[n]
    }
    return str.trim()
  }
}
