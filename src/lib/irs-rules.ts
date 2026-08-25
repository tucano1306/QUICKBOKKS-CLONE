/**
 * REGLAS DEL IRS — funciones puras, sin acceso a base de datos.
 *
 * Vive aparte de form-1040-service.ts para que las pantallas (componentes de
 * cliente) puedan usar EXACTAMENTE las mismas reglas que el backend. Antes
 * cada lado calculaba por su cuenta y las cifras no coincidían.
 */

// Devuelve el valor del año exacto; si no existe, usa el año disponible más
// reciente que sea <= al solicitado; si el año es anterior a todos, el más antiguo.
export function pickForYear<T>(table: { [year: number]: T }, year: number): T {
  if (table[year]) return table[year];
  const years = Object.keys(table).map(Number).sort((a, b) => a - b);
  const atOrBefore = years.filter(y => y <= year);
  const useYear = atOrBefore.length > 0 ? Math.max(...atOrBefore) : years[0];
  return table[useYear];
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

// ── Reglas del IRS compartidas ──────────────────────────────────────────────
// Todas las rutas (compute, auto-populate, save) deben usar estos helpers para
// que la app no produzca dos cifras distintas para el mismo concepto.

// Base salarial del Seguro Social: el 12.4% de SS solo se cobra hasta este tope.
// El 2.9% de Medicare no tiene tope.
const SS_WAGE_BASE: { [year: number]: number } = {
  2024: 168600,
  2025: 176100,
};

export function getSocialSecurityWageBase(year: number): number {
  return pickForYear(SS_WAGE_BASE, year);
}

// Límite de la Sección 179 (deducción inmediata de activos) por año.
const SECTION_179_LIMITS: { [year: number]: { limit: number; phaseOutThreshold: number } } = {
  2024: { limit: 1220000, phaseOutThreshold: 3050000 },
  2025: { limit: 1250000, phaseOutThreshold: 3130000 },
};

export function getSection179Limits(year: number) {
  return pickForYear(SECTION_179_LIMITS, year);
}

/**
 * Sección 179: la deducción no puede superar el límite del año, se reduce dólar
 * por dólar sobre el umbral de eliminación gradual, y NO puede exceder el
 * ingreso gravable del negocio (no puede crear una pérdida).
 */
export function calculateSection179Deduction(
  assetsPlacedInService: number,
  businessTaxableIncome: number,
  year: number
): number {
  const { limit, phaseOutThreshold } = getSection179Limits(year);
  const excess = Math.max(0, assetsPlacedInService - phaseOutThreshold);
  const allowedLimit = Math.max(0, limit - excess);
  const capped = Math.min(Math.max(0, assetsPlacedInService), allowedLimit);
  return round2(Math.min(capped, Math.max(0, businessTaxableIncome)));
}

export interface SelfEmploymentTaxResult {
  netEarnings: number;
  socialSecurityPortion: number;
  medicarePortion: number;
  tax: number;
  deductiblePortion: number;
}

/**
 * Schedule SE. 12.4% de Seguro Social hasta la base salarial del año (reducida
 * por los salarios W-2 que ya cotizaron) + 2.9% de Medicare sin tope, sobre el
 * 92.35% de la ganancia neta. Para ingresos bajos equivale al 15.3%.
 */
export function calculateSelfEmploymentTax(
  netProfit: number,
  year: number,
  w2SocialSecurityWages: number = 0
): SelfEmploymentTaxResult {
  const netEarnings = round2(Math.max(0, netProfit) * 0.9235);
  if (netEarnings <= 0) {
    return { netEarnings: 0, socialSecurityPortion: 0, medicarePortion: 0, tax: 0, deductiblePortion: 0 };
  }
  const remainingWageBase = Math.max(0, getSocialSecurityWageBase(year) - Math.max(0, w2SocialSecurityWages));
  const socialSecurityPortion = round2(Math.min(netEarnings, remainingWageBase) * 0.124);
  const medicarePortion = round2(netEarnings * 0.029);
  const tax = round2(socialSecurityPortion + medicarePortion);
  return { netEarnings, socialSecurityPortion, medicarePortion, tax, deductiblePortion: round2(tax / 2) };
}

// Form 8959 – Additional Medicare Tax: 0.9% sobre salarios Medicare + ingreso
// de autoempleo por encima del umbral, que depende del estado civil.
const ADDITIONAL_MEDICARE_THRESHOLDS: { [status: string]: number } = {
  MARRIED_FILING_JOINTLY: 250000,
  MARRIED_FILING_SEPARATELY: 125000,
  SINGLE: 200000,
  HEAD_OF_HOUSEHOLD: 200000,
  QUALIFYING_SURVIVING_SPOUSE: 200000,
};

export function getAdditionalMedicareThreshold(filingStatus: string): number {
  return ADDITIONAL_MEDICARE_THRESHOLDS[filingStatus] ?? 200000;
}

/**
 * Form 8959. Se aplica sobre salarios sujetos a Medicare MÁS el ingreso neto de
 * autoempleo — nunca sobre el AGI.
 */
export function calculateAdditionalMedicareTax(
  medicareWages: number,
  seNetEarnings: number,
  filingStatus: string
): number {
  const base = Math.max(0, medicareWages) + Math.max(0, seNetEarnings);
  const threshold = getAdditionalMedicareThreshold(filingStatus);
  return round2(Math.max(0, base - threshold) * 0.009);
}

/**
 * Deducción QBI (Form 8995). El QBI se reduce por la parte deducible del
 * impuesto de autoempleo, y la deducción se limita al 20% del ingreso gravable
 * antes de la propia QBI.
 */
export function calculateQbiDeduction(
  scheduleCNetProfit: number,
  deductibleSeTax: number,
  agi: number,
  deductionBeforeQbi: number
): number {
  const qbi = Math.max(0, scheduleCNetProfit) - Math.max(0, deductibleSeTax);
  if (qbi <= 0) return 0;
  const taxableBeforeQbi = Math.max(0, agi - deductionBeforeQbi);
  return round2(Math.min(qbi * 0.2, taxableBeforeQbi * 0.2));
}

// MACRS GDS, propiedad de 5 años con convención de medio año (vehículos).
// El primer y el último año llevan medio año de depreciación, por eso la tabla
// cubre 6 años y suma 100%.
const MACRS_5YEAR_HALF_YEAR = [0.2, 0.32, 0.192, 0.1152, 0.1152, 0.0576];

export interface DepreciableAsset {
  purchaseDate: Date | string;
  purchasePrice: number;
  salvageValue?: number;
  usefulLife?: number;
}

/**
 * Depreciación del año fiscal para un vehículo (Form 4562 → Schedule C línea 13).
 *
 * El IRS exige MACRS, no línea recta: la línea recta subestima la deducción de
 * los primeros años. MACRS ignora el valor residual a propósito (la base
 * depreciable es el costo completo).
 *
 * NO aplica los topes de auto de lujo de la §280F ni el porcentaje de uso
 * comercial: eso requiere datos que la app no registra y lo ajusta el contador.
 */
export function calculateVehicleDepreciation(asset: DepreciableAsset, taxYear: number): number {
  const purchaseYear = new Date(asset.purchaseDate).getUTCFullYear();
  const yearIndex = taxYear - purchaseYear;
  if (yearIndex < 0 || yearIndex >= MACRS_5YEAR_HALF_YEAR.length) return 0;
  const basis = Math.max(0, asset.purchasePrice ?? 0);
  return round2(basis * MACRS_5YEAR_HALF_YEAR[yearIndex]);
}

export function calculateVehicleDepreciationTotal(assets: DepreciableAsset[], taxYear: number): number {
  return round2(assets.reduce((sum, a) => sum + calculateVehicleDepreciation(a, taxYear), 0));
}

export interface ItemizedDeductionInput {
  medicalExpenses?: number;
  stateLocalTax?: number;
  mortgageInterest?: number;
  charitableContributions?: number;
}

// Tope SALT (Schedule A línea 5e) por año.
// OJO: la legislación de julio de 2025 elevó este tope por encima de $10,000.
// Se deja en el monto histórico a propósito: confirmá la cifra definitiva en las
// instrucciones del Schedule A del año antes de subirla aquí.
const SALT_CAP: { [year: number]: number } = {
  2024: 10000,
  2025: 10000,
};

export function getSaltCap(year: number): number {
  return pickForYear(SALT_CAP, year);
}

/**
 * Schedule A. Aplica el piso del 7.5% del AGI a los gastos médicos y el tope
 * SALT, de modo que el total SIEMPRE sea la suma de las líneas que se muestran.
 */
export function calculateItemizedDeductions(
  input: ItemizedDeductionInput,
  agi: number,
  year: number
) {
  const medicalRaw = Math.max(0, input.medicalExpenses ?? 0);
  const medicalFloor = round2(Math.max(0, agi) * 0.075);
  const medicalDeductible = round2(Math.max(0, medicalRaw - medicalFloor));

  const saltRaw = Math.max(0, input.stateLocalTax ?? 0);
  const saltCap = getSaltCap(year);
  const saltDeductible = round2(Math.min(saltRaw, saltCap));

  const mortgageInterest = round2(Math.max(0, input.mortgageInterest ?? 0));
  const charitableContributions = round2(Math.max(0, input.charitableContributions ?? 0));

  return {
    medicalRaw,
    medicalFloor,
    medicalDeductible,
    saltRaw,
    saltCap,
    saltDeductible,
    mortgageInterest,
    charitableContributions,
    total: round2(medicalDeductible + saltDeductible + mortgageInterest + charitableContributions),
  };
}

/**
 * El contribuyente deduce la MAYOR entre la estándar y la detallada.
 */
export function chooseDeduction(standardDeduction: number, itemizedTotal: number) {
  const useItemized = itemizedTotal > standardDeduction;
  return {
    useItemized,
    amount: useItemized ? round2(itemizedTotal) : round2(standardDeduction),
  };
}
