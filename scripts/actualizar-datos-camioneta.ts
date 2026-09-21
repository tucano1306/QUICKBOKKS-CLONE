/**
 * Datos reales de la Suburban, confirmados contra la app de GM Financial.
 *
 *   - Cuota real del contrato: $1.097,86 (la formula da $1.093,86)
 *   - Cancelacion hoy: $34.754,74 (el saldo de capital es $34.619,67)
 *   - El motor se cambio con el odometro en 138.650
 *   - El motor instalado traia 15.000 millas: es de segunda mano
 *
 * En seco por defecto. Para aplicar:  npx tsx scripts/actualizar-datos-camioneta.ts --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const CONTRACT_PAYMENT = 1097.86
const PAYOFF_AMOUNT = 34754.74
const PRINCIPAL_BALANCE = 34619.67
const ENGINE_ODOMETER = 138650
const ENGINE_OWN_MILES = 15000

/**
 * Desglose de la factura del motor (foto del proveedor):
 *   unidad $3.900,00 + pallet $40,00 + impuesto $234,00 + comision tarjeta $156,00
 * El impuesto es exactamente el 6,00% estatal de Florida sobre la unidad.
 * Garantia de 6 anos en piezas y mano de obra, motor "A grade" probado.
 */
const ENGINE_EXTRA = [
  'Motor 5.3L L84 (VIN D, 8vo digito), "A grade", probado, 15.000 millas propias.',
  'Garantia 6 anos piezas y mano de obra.',
  'El impuesto de $234 es el 6,00% estatal de Florida exacto.',
].join(' ')

/**
 * Las notas existentes ya traen la cita del IRS y el porque de la extension
 * conservadora. Se anade lo que falta en vez de reemplazarlas: perder ese
 * razonamiento dejaria el +60.000 sin justificacion escrita.
 */
function mergeNotes(previas: string | null): string {
  const base = (previas ?? '').trim()
  if (!base) return ENGINE_EXTRA
  if (base.includes('Garantia 6 anos')) return base
  return `${base} ${ENGINE_EXTRA}`
}

async function main() {
  const asset = await prisma.asset.findFirst({
    where: { category: 'VEHICLE' },
    include: { loan: true, improvements: { orderBy: { date: 'asc' } } },
  })
  if (!asset) throw new Error('No hay ningun vehiculo registrado')

  console.log(`Vehiculo: ${asset.name} (${asset.assetNumber})`)
  console.log(APPLY ? '\n>>> APLICANDO CAMBIOS\n' : '\n>>> EN SECO (anade --apply para escribir)\n')

  if (!asset.loan) {
    console.log('  ! Sin prestamo registrado: nada que actualizar en financiacion')
  } else {
    const l = asset.loan
    console.log('Prestamo:')
    console.log(`  cuota contractual   ${fmt(l.contractPayment)}  ->  ${fmt(CONTRACT_PAYMENT)}`)
    console.log(`  saldo de capital    ${fmt(l.currentBalance)}  ->  ${fmt(PRINCIPAL_BALANCE)}`)
    console.log(`  cancelacion hoy     ${fmt(l.payoffAmount)}  ->  ${fmt(PAYOFF_AMOUNT)}`)
    console.log(`  intereses corridos  ${fmt(PAYOFF_AMOUNT - PRINCIPAL_BALANCE)} (${dias()} dias al ${(l.apr * 100).toFixed(2)}%)`)

    if (APPLY) {
      await prisma.assetLoan.update({
        where: { id: l.id },
        data: {
          contractPayment: CONTRACT_PAYMENT,
          currentBalance: PRINCIPAL_BALANCE,
          payoffAmount: PAYOFF_AMOUNT,
          payoffDate: new Date(),
        },
      })
    }
  }

  const engine = asset.improvements.find((i) => /motor/i.test(i.label))
  if (!engine) {
    console.log('\n  ! No encuentro la mejora del motor')
  } else {
    console.log('\nMotor:')
    console.log(`  odometro el dia     ${engine.mileageAtImprovement ?? '(sin dato)'}  ->  ${ENGINE_ODOMETER}`)
    console.log(`  millas de la pieza  ${engine.componentMiles ?? '(sin dato)'}  ->  ${ENGINE_OWN_MILES}`)
    console.log(`  anade a la vida util ${engine.addsLifetimeMiles} millas  (sin cambio)`)
    console.log(`  notas               ${engine.notes ? 'se conservan' : '(vacias)'}  ->  ${mergeNotes(engine.notes).length} caracteres (se anade garantia y spec)`)

    if (APPLY) {
      await prisma.assetImprovement.update({
        where: { id: engine.id },
        data: {
          mileageAtImprovement: ENGINE_ODOMETER,
          componentMiles: ENGINE_OWN_MILES,
          notes: mergeNotes(engine.notes),
        },
      })
    }
  }

  console.log(APPLY ? '\nHecho.' : '\nNada escrito.')
}

function fmt(n: number | null | undefined): string {
  return n == null ? '(sin dato)'.padStart(11) : `$${n.toFixed(2)}`.padStart(11)
}

function dias(): string {
  const diario = (PRINCIPAL_BALANCE * 0.089) / 365
  return ((PAYOFF_AMOUNT - PRINCIPAL_BALANCE) / diario).toFixed(0)
}

main()
  .catch((e) => {
    console.error('Error:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
