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
  /**
   * Cuota que figura en el contrato, si se conoce.
   *
   * Manda sobre la que sale de la formula. La diferencia entre ambas no es
   * ruido de redondeo: delata comisiones mensuales o cargos incorporados que
   * no estan en el APR, y arrastra el cuadro entero -- total pagado, coste
   * financiero y comparacion con el interes que reporta el banco.
   */
  contractPayment?: number | null;
}

/**
 * Cuota mensual: la del contrato si se conoce, si no la del prestamo frances.
 */
export function monthlyPayment(terms: LoanTerms): number {
  if (terms.contractPayment != null && terms.contractPayment > 0) {
    return terms.contractPayment;
  }
  return scheduledPayment(terms);
}

/** Cuota teorica pura, la que da la formula de amortizacion constante. */
export function scheduledPayment({ amountFinanced, apr, termMonths }: LoanTerms): number {
  if (amountFinanced <= 0 || termMonths <= 0) return 0;
  const r = apr / 12;
  if (r === 0) return amountFinanced / termMonths;
  return (amountFinanced * r) / (1 - Math.pow(1 + r, -termMonths));
}

/**
 * Diferencia entre la cuota real y la teorica.
 *
 * Un desvio de importe redondo (4,00 al mes) apunta a una comision fija, no a
 * un APR distinto: un tipo diferente daria una cifra con decimales sueltos.
 */
export interface PaymentVariance {
  contract: number;
  scheduled: number;
  perMonth: number;
  overTerm: number;
  /** APR que haria falta para producir la cuota real sin comisiones. */
  impliedApr: number;
}

export function paymentVariance(terms: LoanTerms): PaymentVariance | null {
  if (terms.contractPayment == null || terms.contractPayment <= 0) return null;
  const scheduled = scheduledPayment(terms);
  const contract = terms.contractPayment;

  // APR implicito por biseccion: no hay forma cerrada de despejar el tipo.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const pay = scheduledPayment({ ...terms, apr: mid, contractPayment: null });
    if (pay < contract) lo = mid;
    else hi = mid;
  }

  return {
    contract,
    scheduled,
    perMonth: contract - scheduled,
    overTerm: (contract - scheduled) * terms.termMonths,
    impliedApr: (lo + hi) / 2,
  };
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
  /** Odometro cuando se hizo la mejora. Sin esto no se puede depreciar en prospectivo. */
  mileageAtImprovement: number;
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
 * Depreciacion por millas recorridas, con mejoras capitalizadas en PROSPECTIVO.
 *
 * Una mejora de capital -- cambiar el motor, no un cambio de aceite -- no es
 * gasto del ejercicio. Bajo las Tangible Property Regulations del IRS
 * (§1.263(a)-3) sustituir un componente mayor de la unidad de propiedad es una
 * "restoration" y debe capitalizarse; el safe harbor de mantenimiento rutinario
 * no aplica porque no se espera repetir la operacion dentro de la vida de clase
 * del vehiculo.
 *
 * El punto delicado es COMO se deprecia despues. No se recalcula desde el
 * origen con la vida nueva: eso reduciria retroactivamente la depreciacion ya
 * registrada en ejercicios cerrados. El tratamiento correcto es prospectivo:
 *
 *   1. depreciacion acumulada hasta la fecha de la mejora, con los parametros
 *      originales;
 *   2. valor neto en libros en esa fecha + coste de la mejora = nueva base;
 *   3. esa base, menos el residual, se reparte sobre la vida RESTANTE.
 *
 * Asi la depreciacion pasada queda intacta y solo cambia la futura, que es lo
 * que revisaria un auditor.
 */
export function depreciation(input: DepreciationInput): DepreciationResult {
  const improvements = [...(input.improvements ?? [])].sort(
    (a, b) => a.mileageAtImprovement - b.mileageAtImprovement
  );
  const improvementsCapitalized = improvements.reduce((s, i) => s + i.cost, 0);
  const addedMiles = improvements.reduce((s, i) => s + i.addsLifetimeMiles, 0);

  const effectiveLifetimeMiles = input.lifetimeMiles + addedMiles;
  const milesDriven = Math.max(0, input.currentMileage - input.purchaseMileage);

  // Estado que se va arrastrando mejora a mejora.
  let base = input.purchasePrice; // valor bruto acumulado del activo
  let bookValue = input.purchasePrice;
  let odometer = input.purchaseMileage;
  let lifetimeEnd = input.purchaseMileage + input.lifetimeMiles;
  let accumulated = 0;

  const depreciateTo = (targetMileage: number) => {
    const remainingMiles = Math.max(0, lifetimeEnd - odometer);
    const depreciable = Math.max(0, bookValue - input.salvageValue);
    const rate = remainingMiles > 0 ? depreciable / remainingMiles : 0;
    const miles = Math.max(0, Math.min(targetMileage, lifetimeEnd) - odometer);
    const charge = Math.min(depreciable, miles * rate);
    accumulated += charge;
    bookValue -= charge;
    odometer = Math.max(odometer, targetMileage);
  };

  for (const imp of improvements) {
    depreciateTo(imp.mileageAtImprovement);
    base += imp.cost;
    bookValue += imp.cost;
    lifetimeEnd += imp.addsLifetimeMiles;
  }
  depreciateTo(input.currentMileage);

  const remainingMiles = Math.max(0, lifetimeEnd - odometer);
  const depreciableNow = Math.max(0, bookValue - input.salvageValue);

  return {
    depreciableBase: base,
    effectiveLifetimeMiles,
    milesDriven,
    percentUsed: effectiveLifetimeMiles > 0 ? (milesDriven / effectiveLifetimeMiles) * 100 : 0,
    accumulated,
    bookValue,
    perMile: remainingMiles > 0 ? depreciableNow / remainingMiles : 0,
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
  /**
   * Cancelacion anticipada segun el banco, si se conoce.
   *
   * Es la cifra correcta para "debes mas de lo que vale": el saldo de capital
   * no basta para liberar el titulo, hay que anadir los intereses devengados
   * desde el ultimo pago.
   */
  payoffAmount?: number | null;
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

  // Debes mas de lo que vale. Se mide contra la cancelacion real cuando se
  // conoce: el saldo de capital no libera el titulo por si solo.
  const usePayoff = input.payoffAmount != null && input.payoffAmount > 0;
  const owed = usePayoff ? (input.payoffAmount as number) : input.loanStatus.scheduledBalance;
  const owedLabel = usePayoff ? 'Cancelacion' : 'Saldo';
  const underwater = owed - input.market.value;
  if (underwater > 0) {
    out.push({
      level: 'danger',
      title: 'Debes mas de lo que vale',
      detail: `${owedLabel} ${money(owed)} frente a un valor de mercado de ${money(input.market.value)}. Diferencia de ${money(underwater)}. Si lo vendieras hoy tendrias que poner esa cantidad de tu bolsillo para cancelar el prestamo.`,
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
