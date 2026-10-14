/**
 * Reglas del IRS usadas por el Form 1040 y la pantalla de formularios.
 *
 * Estas pruebas fijan el comportamiento correcto de las fórmulas que antes
 * estaban duplicadas o mal aplicadas: el impuesto de autoempleo se calculaba
 * con y sin el tope de Seguro Social según la ruta, el total del Schedule A no
 * coincidía con sus propias líneas, y varios formularios inventaban montos.
 */

import {
  calculateAdditionalMedicareTax,
  calculateItemizedDeductions,
  calculateQbiDeduction,
  calculateSection179Deduction,
  calculateSelfEmploymentTax,
  calculateVehicleDepreciation,
  chooseDeduction,
} from '@/lib/irs-rules'

describe('Schedule SE — impuesto de autoempleo', () => {
  it('equivale al 15.3% cuando la ganancia está por debajo del tope de Seguro Social', () => {
    expect(calculateSelfEmploymentTax(50000, 2025).tax).toBeCloseTo(7064.78, 2)
  })

  it('aplica el tope de Seguro Social en ganancias altas', () => {
    // 400.000 × 0,9235 = 369.400 → SS solo sobre 176.100; Medicare sobre todo
    expect(calculateSelfEmploymentTax(400000, 2025).tax).toBeCloseTo(32549.0, 2)
  })

  it('no cobra la parte de Seguro Social si los salarios W-2 ya agotaron la base', () => {
    // Solo queda el 2,9% de Medicare sobre 92.350
    expect(calculateSelfEmploymentTax(100000, 2025, 176100).tax).toBeCloseTo(2678.15, 2)
  })

  it('la parte deducible es exactamente la mitad del impuesto', () => {
    const se = calculateSelfEmploymentTax(400000, 2025)
    expect(se.deductiblePortion).toBeCloseTo(se.tax / 2, 2)
  })

  it('es cero si no hay ganancia', () => {
    expect(calculateSelfEmploymentTax(-5000, 2025).tax).toBe(0)
    expect(calculateSelfEmploymentTax(0, 2025).tax).toBe(0)
  })
})

describe('Schedule A — deducciones detalladas', () => {
  const input = {
    medicalExpenses: 9000,
    stateLocalTax: 25000,
    mortgageInterest: 12000,
    charitableContributions: 3000,
  }

  it('resta el piso del 7.5% del AGI a los gastos médicos', () => {
    expect(calculateItemizedDeductions(input, 80000, 2025).medicalDeductible).toBeCloseTo(3000, 2)
  })

  it('aplica el tope SALT', () => {
    expect(calculateItemizedDeductions(input, 80000, 2025).saltDeductible).toBeCloseTo(10000, 2)
  })

  it('INVARIANTE: el total es la suma de las líneas deducibles, no de los montos brutos', () => {
    const it = calculateItemizedDeductions(input, 80000, 2025)
    const sumaDeLineas =
      it.medicalDeductible + it.saltDeductible + it.mortgageInterest + it.charitableContributions
    expect(it.total).toBeCloseTo(sumaDeLineas, 2)
    // El total crudo (49.000) inflaba la deducción en 21.000
    expect(it.total).toBeCloseTo(28000, 2)
  })

  it('no produce deducción médica negativa cuando el piso supera el gasto', () => {
    expect(calculateItemizedDeductions({ medicalExpenses: 1000 }, 200000, 2025).medicalDeductible).toBe(0)
  })
})

describe('Deducción estándar vs detallada', () => {
  it('toma la detallada cuando supera a la estándar', () => {
    const elegido = chooseDeduction(15000, 28000)
    expect(elegido.useItemized).toBe(true)
    expect(elegido.amount).toBe(28000)
  })

  it('toma la estándar cuando la detallada es menor', () => {
    const elegido = chooseDeduction(15000, 5000)
    expect(elegido.useItemized).toBe(false)
    expect(elegido.amount).toBe(15000)
  })
})

describe('Form 8995 — deducción QBI', () => {
  it('reduce el QBI por la mitad deducible del impuesto de autoempleo', () => {
    const se = calculateSelfEmploymentTax(100000, 2025)
    const agi = 100000 - se.deductiblePortion
    const qbi = calculateQbiDeduction(100000, se.deductiblePortion, agi, 15000)
    // Sin la reducción daría 20.000
    expect(qbi).toBeLessThan(20000)
    expect(qbi).toBeCloseTo(Math.min((100000 - se.deductiblePortion) * 0.2, (agi - 15000) * 0.2), 2)
  })

  it('se limita al 20% del ingreso gravable antes de la propia QBI', () => {
    // Ingreso gravable casi nulo ⇒ la deducción queda topada por ese límite
    expect(calculateQbiDeduction(100000, 0, 16000, 15000)).toBeCloseTo(200, 2)
  })

  it('es cero sin ganancia de negocio', () => {
    expect(calculateQbiDeduction(0, 0, 50000, 15000)).toBe(0)
    expect(calculateQbiDeduction(-1000, 0, 50000, 15000)).toBe(0)
  })
})

describe('Form 8959 — Additional Medicare Tax', () => {
  it('usa el umbral que corresponde a cada estado civil', () => {
    expect(calculateAdditionalMedicareTax(300000, 0, 'MARRIED_FILING_JOINTLY')).toBeCloseTo(450, 2)
    expect(calculateAdditionalMedicareTax(300000, 0, 'SINGLE')).toBeCloseTo(900, 2)
    expect(calculateAdditionalMedicareTax(300000, 0, 'MARRIED_FILING_SEPARATELY')).toBeCloseTo(1575, 2)
  })

  it('suma salarios Medicare e ingreso de autoempleo', () => {
    expect(calculateAdditionalMedicareTax(150000, 150000, 'SINGLE')).toBeCloseTo(900, 2)
  })

  it('es cero por debajo del umbral', () => {
    expect(calculateAdditionalMedicareTax(150000, 0, 'SINGLE')).toBe(0)
  })
})

describe('Sección 179', () => {
  it('respeta el límite del año', () => {
    expect(calculateSection179Deduction(2000000, 3000000, 2025)).toBe(1250000)
  })

  it('nunca excede el ingreso gravable del negocio (no crea pérdida)', () => {
    expect(calculateSection179Deduction(50000, 20000, 2025)).toBe(20000)
    expect(calculateSection179Deduction(50000, -5000, 2025)).toBe(0)
  })

  it('reduce el límite dólar por dólar sobre el umbral de eliminación gradual', () => {
    const { limit, phaseOutThreshold } = { limit: 1250000, phaseOutThreshold: 3130000 }
    const activos = phaseOutThreshold + 250000
    expect(calculateSection179Deduction(activos, 10000000, 2025)).toBe(limit - 250000)
  })
})

describe('Form 4562 — depreciación de vehículos (MACRS 5 años, medio año)', () => {
  const auto = { purchaseDate: '2025-06-01', purchasePrice: 40000, salvageValue: 5000, usefulLife: 5 }

  it('sigue los porcentajes de la tabla MACRS', () => {
    expect(calculateVehicleDepreciation(auto, 2025)).toBeCloseTo(8000, 2) // 20%
    expect(calculateVehicleDepreciation(auto, 2026)).toBeCloseTo(12800, 2) // 32%
    expect(calculateVehicleDepreciation(auto, 2030)).toBeCloseTo(2304, 2) // 5,76%
  })

  it('deprecia el costo completo en 6 años y nada después', () => {
    const total = [2025, 2026, 2027, 2028, 2029, 2030].reduce(
      (s, y) => s + calculateVehicleDepreciation(auto, y),
      0
    )
    expect(total).toBeCloseTo(40000, 2)
    expect(calculateVehicleDepreciation(auto, 2031)).toBe(0)
    expect(calculateVehicleDepreciation(auto, 2024)).toBe(0)
  })
})
