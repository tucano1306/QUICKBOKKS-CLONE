/**
 * ECONOMIA REAL DE UN VEHICULO
 *
 * La pantalla de depreciacion mostraba un unico numero, "Valor Actual", que en
 * realidad era el valor EN LIBROS: el precio menos la depreciacion contable.
 * Eso no es lo que pagaria un dealer ni CarMax, y leerlo como si lo fuera lleva
 * a decisiones equivocadas -- sobre todo en un vehiculo de uso intensivo, donde
 * el mercado castiga el millaje mucho mas rapido que una linea recta contable.
 *
 * Aqui se separan tres cosas que antes iban mezcladas:
 *
 *   1. VALOR EN LIBROS  - contabilidad. Sirve para impuestos y balance.
 *   2. VALOR DE MERCADO - lo que alguien pagaria hoy. Solo se sabe de verdad
 *                         con una tasacion; entre tasaciones se estima y se
 *                         etiqueta como estimacion.
 *   3. COSTE REAL       - lo desembolsado de verdad: enganche, intereses y
 *                         mejoras. Casi siempre muy por encima del precio.
 *
 * Todo el modulo es puro: no toca la base de datos ni React.
 */

// ---------------------------------------------------------------- prestamo

export interface LoanTerms {
  /** Importe financiado (no el precio del vehiculo). */
  amountFinanced: number;
  /** APR anual en tanto por uno: 8.90% -> 0.089 */
  apr: number;
  /** Plazo en meses. */
  termMonths: number;
}

/** Cuota mensual de un prestamo frances (amortizacion constante). */
export function monthlyPayment({ amountFinanced, apr, termMonths }: LoanTerms): number {
  if (amountFinanced <= 0 || termMonths <= 0) return 0;
  const r = apr / 12;
  if (r === 0) return amountFinanced / termMonths;
  return (amountFinanced * r) / (1 - Math.pow(1 + r, -termMonths));
}

export interface AmortizationRow {
  payment: number;
  interest: number;
  principal: number;
  balance: number;
  cumulativeInterest: number;
}

/**
 * Cuadro de amortizacion completo.
 *
 * Es el calendario TEORICO. Los prestamos de auto suelen llevar interes simple
 * diario ("we will figure the finance charge on a daily basis"), asi que pagar
 * tarde hace correr mas interes del que dice este cuadro. La desviacion se mide
 * aparte con `interestDrift`.
 */
export function amortizationSchedule(terms: LoanTerms): AmortizationRow[] {
  const pmt = monthlyPayment(terms);
  const r = terms.apr / 12;
  const rows: AmortizationRow[] = [];
  let balance = terms.amountFinanced;
  let cum = 0;

  for (let k = 0; k < terms.termMonths && balance > 0.005; k++) {
    const interest = balance * r;
    let principal = pmt - interest;
    if (principal > balance) principal = balance;
    balance -= principal;
    cum += interest;
    rows.push({ payment: pmt, interest, principal, balance, cumulativeInterest: cum });
  }
  return rows;
}

export interface LoanStatus {
  monthlyPayment: number;
  totalOfPayments: number;
  financeCharge: number;
  paymentsMade: number;
  scheduledBalance: number;
  interestPaid: number;
  interestRemaining: number;
  /** Saldo mas intereses pendientes: lo que aun saldra del bolsillo. */
  remainingOutlay: number;
}

/** Donde estas en el prestamo, a partir de los pagos que faltan. */
export function loanStatus(terms: LoanTerms, paymentsRemaining: number): LoanStatus {
  const rows = amortizationSchedule(terms);
  const pmt = monthlyPayment(terms);
  const totalOfPayments = pmt * terms.termMonths;
  const financeCharge = totalOfPayments - terms.amountFinanced;
  const made = Math.max(0, Math.min(terms.termMonths, terms.termMonths - paymentsRemaining));
  const row = made > 0 ? rows[made - 1] : undefined;
  const interestPaid = row ? row.cumulativeInterest : 0;
  const scheduledBalance = row ? row.balance : terms.amountFinanced;
  const interestRemaining = financeCharge - interestPaid;

  return {
    monthlyPayment: pmt,
    totalOfPayments,
    financeCharge,
    paymentsMade: made,
    scheduledBalance,
    interestPaid,
    interestRemaining,
    remainingOutlay: scheduledBalance + interestRemaining,
  };
}

export interface InterestDrift {
  scheduled: number;
  actual: number;
  /** Positivo = pagaste MAS interes del previsto. */
  drift: number;
  driftPct: number;
  /** Proyeccion de la desviacion sobre los meses que quedan. */
  projectedExtra: number;
}

/**
 * Compara el interes real de los ultimos 12 meses con el del cuadro.
 *
 * Una desviacion sostenida al alza casi siempre significa que los pagos entran
 * tarde: con interes simple diario, cada dia de retraso corre. Es la unica
 * parte del coste sobre la que se puede actuar sin refinanciar.
 */
export function interestDrift(
  terms: LoanTerms,
  paymentsRemaining: number,
  actualInterestLast12: number
): InterestDrift {
  const rows = amortizationSchedule(terms);
  const made = terms.termMonths - paymentsRemaining;
  const from = Math.max(0, made - 12);
  const scheduled = rows.slice(from, made).reduce((s, r) => s + r.interest, 0);
  const drift = actualInterestLast12 - scheduled;
  return {
    scheduled,
    actual: actualInterestLast12,
    drift,
    driftPct: scheduled > 0 ? (drift / scheduled) * 100 : 0,
    projectedExtra: (drift / 12) * paymentsRemaining,
  };
}

// ------------------------------------------------------------ depreciacion

export interface CapitalImprovement {
  label: string;
  date: Date;
  cost: number;
  /** Millas de vida util que anade la mejora. Un motor de reemplazo las anade. */
  addsLifetimeMiles: number;
}

export interface DepreciationInput {
  purchasePrice: number;
  salvageValue: number;
  purchaseMileage: number;
  currentMileage: number;
  /** Vida util original en millas. */
  lifetimeMiles: number;
  improvements?: CapitalImprovement[];
}

export interface DepreciationResult {
  /** Base depreciable = precio + mejoras capitalizadas. */
  depreciableBase: number;
  /** Vida util tras sumar lo que aportan las mejoras. */
  effectiveLifetimeMiles: number;
  milesDriven: number;
  percentUsed: number;
  accumulated: number;
  bookValue: number;
  perMile: number;
  improvementsCapitalized: number;
}

/**
 * Depreciacion por millas recorridas, con mejoras capitalizadas.
 *
 * Una mejora de capital -- cambiar el motor, no un cambio de aceite -- no es
 * gasto del ejercicio: se suma al valor del activo y alarga su vida util. Si no
 * se trata asi, el vehiculo llega a valor residual mientras todavia se paga el
 * prestamo, que es justo lo que pasaba aqui: a 40.000 millas al ano las 200.000
 * de vida util se agotaban ano y medio antes de la ultima cuota.
 */
export function depreciation(input: DepreciationInput): DepreciationResult {
  const improvements = input.improvements ?? [];
  const improvementsCapitalized = improvements.reduce((s, i) => s + i.cost, 0);
  const addedMiles = improvements.reduce((s, i) => s + i.addsLifetimeMiles, 0);

  const depreciableBase = input.purchasePrice + improvementsCapitalized;
  const effectiveLifetimeMiles = input.lifetimeMiles + addedMiles;
  const milesDriven = Math.max(0, input.currentMileage - input.purchaseMileage);

  const depreciable = Math.max(0, depreciableBase - input.salvageValue);
  const perMile = effectiveLifetimeMiles > 0 ? depreciable / effectiveLifetimeMiles : 0;

  const accumulated = Math.min(depreciable, milesDriven * perMile);
  const bookValue = depreciableBase - accumulated;

  return {
    depreciableBase,
    effectiveLifetimeMiles,
    milesDriven,
    percentUsed: effectiveLifetimeMiles > 0 ? (milesDriven / effectiveLifetimeMiles) * 100 : 0,
    accumulated,
    bookValue,
    perMile,
    improvementsCapitalized,
  };
}

// ----------------------------------------------------------- valor mercado

export interface MarketValuation {
  date: Date;
  value: number;
  mileage: number;
  /** De donde sale: "CarMax", "KBB", "Dealer Chevrolet"... */
  source: string;
}

export type MarketValueBasis = 'appraisal' | 'estimate';

export interface MarketValue {
  value: number;
  basis: MarketValueBasis;
  /** La tasacion desde la que se calcula, si hay alguna. */
  anchor?: MarketValuation;
  ageYears: number;
  /** Contra el valor en libros. Negativo = vale menos de lo que dicen los libros. */
  vsBookValue: number;
}

/**
 * Valor de mercado.
 *
 * Con una tasacion reciente se usa ESA: es un dato, no una estimacion. Si se ha
 * quedado vieja, se extrapola desde ella descontando las millas recorridas
 * despues. Sin ninguna tasacion se cae a un modelo, y se marca como estimacion
 * para que nadie lo confunda con una oferta real.
 *
 * El modelo no puede saber el precio de CarMax y no pretende hacerlo: aplica
 * una curva por antiguedad mas una penalizacion por millaje por encima del uso
 * normal, que es donde se hunde el valor de un vehiculo de trabajo. Sirve para
 * ver la tendencia entre tasaciones, no para negociar.
 */
export function marketValue(
  purchasePrice: number,
  purchaseDate: Date,
  currentMileage: number,
  bookValue: number,
  valuations: MarketValuation[] = [],
  asOf: Date = new Date(),
  opts: { normalMilesPerYear?: number; penaltyPerExcessMile?: number } = {}
): MarketValue {
  const normalMilesPerYear = opts.normalMilesPerYear ?? 13500;
  const penaltyPerExcessMile = opts.penaltyPerExcessMile ?? 0.12;
  const ageYears = Math.max(
    0,
    (asOf.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 3600 * 1000)
  );

  const sorted = [...valuations].sort((a, b) => b.date.getTime() - a.date.getTime());
  const latest = sorted[0];

  if (latest) {
    // Desde la tasacion solo se descuenta lo recorrido despues. No se vuelve a
    // aplicar la curva de antiguedad: la tasacion ya la incorpora.
    const extraMiles = Math.max(0, currentMileage - latest.mileage);
    const value = Math.max(0, latest.value - extraMiles * penaltyPerExcessMile);
    const isFresh = extraMiles < 1000;
    return {
      value,
      basis: isFresh ? 'appraisal' : 'estimate',
      anchor: latest,
      ageYears,
      vsBookValue: value - bookValue,
    };
  }

  // Sin tasacion: curva por antiguedad mas castigo por exceso de millaje.
  // ~18% el primer ano y ~13% anual despues, patron tipico de un SUV grande.
  // Aproximado a proposito: es una tendencia, no una tasacion.
  const yearOne = 0.82;
  const afterwards = Math.pow(0.87, Math.max(0, ageYears - 1));
  const byAge = purchasePrice * (ageYears <= 1 ? 1 - 0.18 * ageYears : yearOne * afterwards);

  const expectedMiles = normalMilesPerYear * ageYears;
  const excess = Math.max(0, currentMileage - expectedMiles);
  const value = Math.max(0, byAge - excess * penaltyPerExcessMile);

  return { value, basis: 'estimate', ageYears, vsBookValue: value - bookValue };
}

// ------------------------------------------------------------- coste total

export interface OwnershipInput {
  purchasePrice: number;
  downPayment: number;
  loan: LoanTerms;
  improvements?: CapitalImprovement[];
  milesDriven: number;
  paymentsRemaining: number;
}

export interface OwnershipResult {
  downPayment: number;
  totalOfPayments: number;
  financeCharge: number;
  improvements: number;
  /** Todo lo que habra salido del bolsillo al terminar de pagar. */
  lifetimeOutlay: number;
  /** Cuanto excede al precio del vehiculo. */
  premiumOverPrice: number;
  premiumPct: number;
  /** Desembolsado hasta hoy. */
  paidToDate: number;
  costPerMileToDate: number;
}

/** Lo que cuesta de verdad el vehiculo, no lo que dice la factura. */
export function ownership(input: OwnershipInput): OwnershipResult {
  const status = loanStatus(input.loan, input.paymentsRemaining);
  const improvements = (input.improvements ?? []).reduce((s, i) => s + i.cost, 0);
  const lifetimeOutlay = input.downPayment + status.totalOfPayments + improvements;
  const paidToDate = input.downPayment + status.paymentsMade * status.monthlyPayment + improvements;

  return {
    downPayment: input.downPayment,
    totalOfPayments: status.totalOfPayments,
    financeCharge: status.financeCharge,
    improvements,
    lifetimeOutlay,
    premiumOverPrice: lifetimeOutlay - input.purchasePrice,
    premiumPct: input.purchasePrice > 0 ? (lifetimeOutlay / input.purchasePrice - 1) * 100 : 0,
    paidToDate,
    costPerMileToDate: input.milesDriven > 0 ? paidToDate / input.milesDriven : 0,
  };
}

// ------------------------------------------------------------------ avisos

export type AlertLevel = 'info' | 'warning' | 'danger';

export interface VehicleAlert {
  level: AlertLevel;
  title: string;
  detail: string;
}

export interface AlertInput {
  depreciation: DepreciationResult;
  market: MarketValue;
  loanStatus: LoanStatus;
  milesPerYear: number;
  monthsRemaining: number;
  normalMilesPerYear?: number;
  latestValuationDate?: Date;
}

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Lo que la pantalla deberia haber estado avisando y no avisaba.
 *
 * El caso que motivo todo esto: a 40.000 millas al ano la vida util se agotaba
 * ano y medio antes de la ultima cuota, y nada en la pantalla lo decia.
 */
export function alerts(input: AlertInput): VehicleAlert[] {
  const out: VehicleAlert[] = [];
  const normal = input.normalMilesPerYear ?? 13500;

  // Debes mas de lo que vale.
  const underwater = input.loanStatus.scheduledBalance - input.market.value;
  if (underwater > 0) {
    out.push({
      level: 'danger',
      title: 'Debes mas de lo que vale',
      detail: `Saldo ${money(input.loanStatus.scheduledBalance)} frente a un valor de mercado de ${money(input.market.value)}. Diferencia de ${money(underwater)}. Si lo vendieras hoy tendrias que poner esa cantidad de tu bolsillo para cancelar el prestamo.`,
    });
  }

  // La vida util se agota antes que el prestamo.
  const milesLeft = Math.max(
    0,
    input.depreciation.effectiveLifetimeMiles - input.depreciation.milesDriven
  );
  if (input.milesPerYear > 0) {
    const yearsLeft = milesLeft / input.milesPerYear;
    const monthsLeft = yearsLeft * 12;
    if (monthsLeft < input.monthsRemaining) {
      out.push({
        level: 'warning',
        title: 'La vida util se agota antes que el prestamo',
        detail: `A ${Math.round(input.milesPerYear).toLocaleString('es')} millas al ano quedan ${yearsLeft.toFixed(1)} anos de vida util, pero ${(input.monthsRemaining / 12).toFixed(1)} anos de cuotas. Serian ${((input.monthsRemaining - monthsLeft) / 12).toFixed(1)} anos pagando un activo ya depreciado del todo.`,
      });
    }
  }

  // Uso muy por encima de lo normal.
  if (input.milesPerYear > normal * 1.5) {
    out.push({
      level: 'warning',
      title: 'Uso muy por encima de lo normal',
      detail: `${Math.round(input.milesPerYear).toLocaleString('es')} millas al ano, ${(input.milesPerYear / normal).toFixed(1)} veces el uso tipico. El mercado castiga el millaje mas rapido que la depreciacion contable, asi que el valor real cae por debajo de los libros.`,
    });
  }

  // Los libros van por encima del mercado.
  if (input.market.vsBookValue < -1000) {
    const book = input.market.value - input.market.vsBookValue;
    out.push({
      level: 'info',
      title: 'Los libros van por encima del mercado',
      detail: `Valor en libros ${money(book)}, mercado ${money(input.market.value)}, ${money(-input.market.vsBookValue)} de diferencia. El valor en libros sirve para la contabilidad; para vender o negociar manda el de mercado.`,
    });
  }

  // La tasacion falta o se ha quedado vieja.
  if (input.market.basis === 'estimate') {
    const d = input.latestValuationDate;
    out.push({
      level: 'info',
      title: d ? 'La tasacion se ha quedado vieja' : 'No hay ninguna tasacion',
      detail: d
        ? `La ultima es de ${d.toLocaleDateString('es')} y desde entonces se han recorrido millas, asi que el valor mostrado es una estimacion. Una oferta nueva de CarMax o KBB es gratis y tarda unos minutos.`
        : 'El valor de mercado mostrado es una estimacion del modelo, no una tasacion. Pide una oferta a CarMax o KBB, que es gratis, y registrala para tener el dato real.',
    });
  }

  return out;
}
