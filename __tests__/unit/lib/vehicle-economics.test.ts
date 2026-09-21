import {
  alerts,
  amortizationSchedule,
  depreciation,
  interestDrift,
  loanStatus,
  marketValue,
  monthlyPayment,
  ownership,
  type CapitalImprovement,
} from '@/lib/vehicle-economics'

/**
 * Caso de referencia: el Chevrolet Suburban 2023 real que motivo este modulo.
 * Los numeros salen del contrato y del estado de cuenta, no son inventados.
 */
const SUBURBAN = {
  purchasePrice: 76750,
  downPayment: 14000,
  salvageValue: 15350,
  purchaseDate: new Date('2023-04-30'),
  purchaseMileage: 3,
  currentMileage: 138650,
  lifetimeMiles: 200000,
  loan: { amountFinanced: 62750.7, apr: 0.089, termMonths: 75 },
  paymentsRemaining: 36,
  interestLast12: 4097.13,
}

const MOTOR: CapitalImprovement = {
  label: 'Motor 5.3L de reemplazo (15K millas, garantia 6 anos)',
  date: new Date('2026-07-30'),
  cost: 4330,
  addsLifetimeMiles: 120000,
}

describe('monthlyPayment', () => {
  it('calcula la cuota del Suburban', () => {
    expect(monthlyPayment(SUBURBAN.loan)).toBeCloseTo(1093.86, 1)
  })

  it('sin interes reparte el principal a partes iguales', () => {
    expect(monthlyPayment({ amountFinanced: 1200, apr: 0, termMonths: 12 })).toBe(100)
  })

  it('devuelve 0 con datos vacios en vez de NaN', () => {
    expect(monthlyPayment({ amountFinanced: 0, apr: 0.089, termMonths: 75 })).toBe(0)
    expect(monthlyPayment({ amountFinanced: 1000, apr: 0.089, termMonths: 0 })).toBe(0)
  })
})

describe('amortizationSchedule', () => {
  it('liquida el prestamo exactamente al ultimo pago', () => {
    const rows = amortizationSchedule(SUBURBAN.loan)
    expect(rows).toHaveLength(75)
    expect(rows[rows.length - 1].balance).toBeCloseTo(0, 2)
  })

  it('el interes baja y el capital sube con cada cuota', () => {
    const rows = amortizationSchedule(SUBURBAN.loan)
    expect(rows[0].interest).toBeGreaterThan(rows[74].interest)
    expect(rows[0].principal).toBeLessThan(rows[74].principal)
  })

  it('capital mas interes suman siempre la cuota', () => {
    for (const r of amortizationSchedule(SUBURBAN.loan).slice(0, -1)) {
      expect(r.principal + r.interest).toBeCloseTo(r.payment, 6)
    }
  })
})

describe('loanStatus', () => {
  const st = loanStatus(SUBURBAN.loan, SUBURBAN.paymentsRemaining)

  it('situa los 39 pagos hechos de 75', () => {
    expect(st.paymentsMade).toBe(39)
  })

  it('el finance charge total coincide con el contrato', () => {
    expect(st.totalOfPayments).toBeCloseTo(82039.49, 0)
    expect(st.financeCharge).toBeCloseTo(19288.79, 0)
  })

  it('reparte el interes entre pagado y pendiente sin perder nada', () => {
    expect(st.interestPaid + st.interestRemaining).toBeCloseTo(st.financeCharge, 4)
  })

  it('a estas alturas ya se pago la mayor parte del interes', () => {
    // Importa para decidir si merece la pena refinanciar: lo caro ya paso.
    expect(st.interestPaid).toBeGreaterThan(st.interestRemaining * 2)
  })
})

describe('interestDrift', () => {
  it('detecta que el banco cobro mas interes del programado', () => {
    // El contrato dice interes simple diario, asi que pagar tarde hace correr
    // mas interes del que marca el cuadro.
    const d = interestDrift(SUBURBAN.loan, SUBURBAN.paymentsRemaining, SUBURBAN.interestLast12)
    expect(d.drift).toBeGreaterThan(0)
    expect(d.actual).toBeCloseTo(4097.13, 2)
    expect(d.scheduled).toBeLessThan(d.actual)
  })

  it('proyecta la desviacion sobre los meses que faltan', () => {
    const d = interestDrift(SUBURBAN.loan, SUBURBAN.paymentsRemaining, SUBURBAN.interestLast12)
    expect(d.projectedExtra).toBeCloseTo((d.drift / 12) * 36, 2)
  })

  it('sin desviacion no inventa una', () => {
    const rows = amortizationSchedule(SUBURBAN.loan)
    const exacto = rows.slice(27, 39).reduce((s, r) => s + r.interest, 0)
    const d = interestDrift(SUBURBAN.loan, 36, exacto)
    expect(d.drift).toBeCloseTo(0, 6)
  })
})

describe('depreciation', () => {
  const base = {
    purchasePrice: SUBURBAN.purchasePrice,
    salvageValue: SUBURBAN.salvageValue,
    purchaseMileage: SUBURBAN.purchaseMileage,
    currentMileage: SUBURBAN.currentMileage,
    lifetimeMiles: SUBURBAN.lifetimeMiles,
  }

  it('sin mejoras deprecia por millas recorridas', () => {
    const d = depreciation(base)
    expect(d.milesDriven).toBe(138647)
    expect(d.percentUsed).toBeCloseTo(69.3, 1)
    expect(d.bookValue).toBeLessThan(SUBURBAN.purchasePrice)
  })

  it('capitalizar el motor sube la base y alarga la vida util', () => {
    const sin = depreciation(base)
    const con = depreciation({ ...base, improvements: [MOTOR] })

    expect(con.depreciableBase).toBe(SUBURBAN.purchasePrice + MOTOR.cost)
    expect(con.effectiveLifetimeMiles).toBe(SUBURBAN.lifetimeMiles + MOTOR.addsLifetimeMiles)
    // Al repartirse entre mas millas, cada milla deprecia menos.
    expect(con.perMile).toBeLessThan(sin.perMile)
    expect(con.bookValue).toBeGreaterThan(sin.bookValue)
  })

  it('el motor saca al vehiculo de estar casi agotado', () => {
    // Es el motivo de capitalizarlo: al 69% de vida util y con el prestamo vivo
    // hasta 2029, el activo llegaba a residual antes que la ultima cuota.
    expect(depreciation(base).percentUsed).toBeGreaterThan(65)
    expect(depreciation({ ...base, improvements: [MOTOR] }).percentUsed).toBeLessThan(45)
  })

  it('nunca deprecia por debajo del valor residual', () => {
    const d = depreciation({ ...base, currentMileage: 900000 })
    expect(d.bookValue).toBeCloseTo(SUBURBAN.salvageValue, 6)
    expect(d.accumulated).toBeCloseTo(SUBURBAN.purchasePrice - SUBURBAN.salvageValue, 6)
  })

  it('un odometro por debajo del de compra no da millas negativas', () => {
    expect(depreciation({ ...base, currentMileage: 0 }).milesDriven).toBe(0)
  })
})

describe('marketValue', () => {
  const book = depreciation({
    purchasePrice: SUBURBAN.purchasePrice,
    salvageValue: SUBURBAN.salvageValue,
    purchaseMileage: SUBURBAN.purchaseMileage,
    currentMileage: SUBURBAN.currentMileage,
    lifetimeMiles: SUBURBAN.lifetimeMiles,
  }).bookValue
  const hoy = new Date('2026-09-21')

  it('sin tasacion marca el resultado como estimacion', () => {
    const m = marketValue(
      SUBURBAN.purchasePrice, SUBURBAN.purchaseDate, SUBURBAN.currentMileage, book, [], hoy
    )
    expect(m.basis).toBe('estimate')
    expect(m.anchor).toBeUndefined()
  })

  it('una tasacion reciente manda sobre el modelo', () => {
    const tasacion = { date: new Date('2026-09-15'), value: 29500, mileage: 138650, source: 'CarMax' }
    const m = marketValue(
      SUBURBAN.purchasePrice, SUBURBAN.purchaseDate, SUBURBAN.currentMileage, book, [tasacion], hoy
    )
    expect(m.basis).toBe('appraisal')
    expect(m.value).toBe(29500)
    expect(m.anchor?.source).toBe('CarMax')
  })

  it('una tasacion vieja se extrapola y deja de ser dato', () => {
    const tasacion = { date: new Date('2026-01-10'), value: 34000, mileage: 120000, source: 'KBB' }
    const m = marketValue(
      SUBURBAN.purchasePrice, SUBURBAN.purchaseDate, SUBURBAN.currentMileage, book, [tasacion], hoy
    )
    expect(m.basis).toBe('estimate')
    expect(m.value).toBeLessThan(34000)
    expect(m.anchor?.source).toBe('KBB')
  })

  it('usa la tasacion mas reciente, no la primera de la lista', () => {
    const vieja = { date: new Date('2025-01-01'), value: 48000, mileage: 90000, source: 'KBB' }
    const nueva = { date: new Date('2026-09-20'), value: 29000, mileage: 138650, source: 'CarMax' }
    const m = marketValue(
      SUBURBAN.purchasePrice, SUBURBAN.purchaseDate, SUBURBAN.currentMileage, book, [vieja, nueva], hoy
    )
    expect(m.value).toBe(29000)
  })

  it('el alto millaje hunde el valor por debajo de los libros', () => {
    // 40.000 millas al ano: el mercado castiga mucho mas rapido que la
    // depreciacion contable, y esa brecha es justo lo que hay que mostrar.
    const m = marketValue(
      SUBURBAN.purchasePrice, SUBURBAN.purchaseDate, SUBURBAN.currentMileage, book, [], hoy
    )
    expect(m.vsBookValue).toBeLessThan(0)
  })

  it('nunca da un valor negativo', () => {
    const m = marketValue(
      SUBURBAN.purchasePrice, SUBURBAN.purchaseDate, 2000000, book, [], hoy
    )
    expect(m.value).toBe(0)
  })
})

describe('ownership', () => {
  const o = ownership({
    purchasePrice: SUBURBAN.purchasePrice,
    downPayment: SUBURBAN.downPayment,
    loan: SUBURBAN.loan,
    improvements: [MOTOR],
    milesDriven: 138647,
    paymentsRemaining: SUBURBAN.paymentsRemaining,
  })

  it('suma enganche, cuotas y mejoras', () => {
    expect(o.lifetimeOutlay).toBeCloseTo(14000 + 82039.49 + 4330, 0)
  })

  it('el sobrecoste sobre el precio es del 30% largo', () => {
    expect(o.premiumOverPrice).toBeCloseTo(23619.49, 0)
    expect(o.premiumPct).toBeCloseTo(30.8, 1)
  })

  it('calcula el coste por milla con lo desembolsado hasta hoy', () => {
    expect(o.costPerMileToDate).toBeGreaterThan(0.4)
    expect(o.costPerMileToDate).toBeLessThan(0.5)
  })

  it('sin millas recorridas no divide por cero', () => {
    const cero = ownership({
      purchasePrice: SUBURBAN.purchasePrice,
      downPayment: SUBURBAN.downPayment,
      loan: SUBURBAN.loan,
      milesDriven: 0,
      paymentsRemaining: 75,
    })
    expect(cero.costPerMileToDate).toBe(0)
  })
})

describe('alerts', () => {
  const dep = depreciation({
    purchasePrice: SUBURBAN.purchasePrice,
    salvageValue: SUBURBAN.salvageValue,
    purchaseMileage: SUBURBAN.purchaseMileage,
    currentMileage: SUBURBAN.currentMileage,
    lifetimeMiles: SUBURBAN.lifetimeMiles,
  })
  const st = loanStatus(SUBURBAN.loan, SUBURBAN.paymentsRemaining)
  const mkt = marketValue(
    SUBURBAN.purchasePrice, SUBURBAN.purchaseDate, SUBURBAN.currentMileage,
    dep.bookValue, [], new Date('2026-09-21')
  )

  const avisos = alerts({
    depreciation: dep,
    market: mkt,
    loanStatus: st,
    milesPerYear: 40839,
    monthsRemaining: 36,
  })

  it('avisa de que la vida util se agota antes que el prestamo', () => {
    // Es el aviso que la pantalla nunca dio y que motivo todo esto.
    expect(avisos.some((a) => a.title.includes('vida util se agota'))).toBe(true)
  })

  it('avisa del uso muy por encima de lo normal', () => {
    expect(avisos.some((a) => a.title.includes('por encima de lo normal'))).toBe(true)
  })

  it('avisa de que no hay tasacion', () => {
    expect(avisos.some((a) => a.title.includes('No hay ninguna tasacion'))).toBe(true)
  })

  it('el motor capitalizado calla el aviso de vida util', () => {
    const conMotor = depreciation({
      purchasePrice: SUBURBAN.purchasePrice,
      salvageValue: SUBURBAN.salvageValue,
      purchaseMileage: SUBURBAN.purchaseMileage,
      currentMileage: SUBURBAN.currentMileage,
      lifetimeMiles: SUBURBAN.lifetimeMiles,
      improvements: [MOTOR],
    })
    const despues = alerts({
      depreciation: conMotor,
      market: mkt,
      loanStatus: st,
      milesPerYear: 40839,
      monthsRemaining: 36,
    })
    expect(despues.some((a) => a.title.includes('vida util se agota'))).toBe(false)
  })

  it('un vehiculo sano y con tasacion fresca no genera alarmas graves', () => {
    const sano = depreciation({
      purchasePrice: 40000, salvageValue: 8000, purchaseMileage: 0,
      currentMileage: 20000, lifetimeMiles: 200000,
    })
    const tas = { date: new Date('2026-09-20'), value: 34000, mileage: 20000, source: 'CarMax' }
    const m = marketValue(40000, new Date('2025-01-01'), 20000, sano.bookValue, [tas], new Date('2026-09-21'))
    const a = alerts({
      depreciation: sano,
      market: m,
      loanStatus: loanStatus({ amountFinanced: 20000, apr: 0.05, termMonths: 60 }, 30),
      milesPerYear: 12000,
      monthsRemaining: 30,
    })
    expect(a.filter((x) => x.level === 'danger')).toHaveLength(0)
  })
})
