import { prisma } from '@/lib/prisma';
import {
  alerts,
  depreciation,
  interestDrift,
  loanStatus,
  marketValue,
  monthlyPayment,
  ownership,
  type CapitalImprovement,
  type DepreciationResult,
  type InterestDrift,
  type LoanStatus,
  type MarketValuation,
  type MarketValue,
  type OwnershipResult,
  type VehicleAlert,
} from '@/lib/vehicle-economics';

/**
 * Ensambla los datos del activo y le aplica el motor de calculo.
 *
 * Toda la aritmetica vive en `vehicle-economics.ts`, que es puro y esta
 * cubierto por tests. Aqui solo se leen filas y se traducen a las entradas que
 * ese modulo espera, para que la ruta de API no tenga logica que probar.
 */

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

export interface VehicleEconomics {
  asset: {
    id: string;
    name: string;
    assetNumber: string;
    vin: string | null;
    yearModel: number | null;
    purchaseDate: string;
    purchasePrice: number;
    salvageValue: number;
    purchaseMileage: number;
    currentMileage: number;
    lifetimeMiles: number;
    lastMileageUpdate: string | null;
  };
  usage: {
    milesDriven: number;
    ageYears: number;
    milesPerYear: number;
    /** Cuantas veces el uso tipico (13.500 mi/ano). */
    vsNormalUse: number;
  };
  depreciation: DepreciationResult;
  market: MarketValue;
  valuations: MarketValuation[];
  improvements: CapitalImprovement[];
  loan: (LoanStatus & {
    lender: string | null;
    apr: number;
    termMonths: number;
    amountFinanced: number;
    downPayment: number;
    reportedBalance: number | null;
    maturityDate: string | null;
    monthsRemaining: number;
    drift: InterestDrift | null;
  }) | null;
  ownership: OwnershipResult | null;
  alerts: VehicleAlert[];
}

/** Uso anual tipico de un vehiculo particular, la referencia del mercado. */
export const NORMAL_MILES_PER_YEAR = 13500;

export async function getVehicleEconomics(
  assetId: string,
  asOf: Date = new Date()
): Promise<VehicleEconomics | null> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      valuations: { orderBy: { date: 'desc' } },
      improvements: { orderBy: { date: 'asc' } },
      loan: true,
    },
  });
  if (!asset) return null;

  const purchaseMileage = asset.purchaseMileage ?? 0;
  const currentMileage = asset.currentMileage ?? purchaseMileage;
  const lifetimeMiles = asset.estimatedLifetimeMiles ?? 0;

  const improvements: CapitalImprovement[] = asset.improvements.map((i) => ({
    label: i.label,
    date: i.date,
    cost: i.cost,
    addsLifetimeMiles: i.addsLifetimeMiles,
    // Sin odometro registrado se asume el actual: la mejora no habra
    // depreciado nada todavia, que es lo prudente.
    mileageAtImprovement: currentMileage,
  }));

  const dep = depreciation({
    purchasePrice: asset.purchasePrice,
    salvageValue: asset.salvageValue,
    purchaseMileage,
    currentMileage,
    lifetimeMiles,
    improvements,
  });

  const valuations: MarketValuation[] = asset.valuations.map((v) => ({
    date: v.date,
    value: v.value,
    mileage: v.mileage,
    source: v.source,
  }));

  const mkt = marketValue(
    asset.purchasePrice,
    asset.purchaseDate,
    currentMileage,
    dep.bookValue,
    valuations,
    asOf,
    { normalMilesPerYear: NORMAL_MILES_PER_YEAR }
  );

  const ageYears = Math.max(
    0.01,
    (asOf.getTime() - asset.purchaseDate.getTime()) / MS_PER_YEAR
  );
  const milesPerYear = dep.milesDriven / ageYears;

  let loanBlock: VehicleEconomics['loan'] = null;
  let own: OwnershipResult | null = null;
  let monthsRemaining = 0;

  if (asset.loan) {
    const l = asset.loan;
    const terms = { amountFinanced: l.amountFinanced, apr: l.apr, termMonths: l.termMonths };
    // Si el banco no da los pagos restantes se deducen de la fecha de
    // vencimiento; y si tampoco hay, del plazo desde la compra.
    monthsRemaining =
      l.paymentsRemaining ??
      (l.maturityDate
        ? Math.max(0, Math.round((l.maturityDate.getTime() - asOf.getTime()) / (MS_PER_YEAR / 12)))
        : Math.max(0, l.termMonths - Math.round(ageYears * 12)));

    const st = loanStatus(terms, monthsRemaining);

    loanBlock = {
      ...st,
      lender: l.lender,
      apr: l.apr,
      termMonths: l.termMonths,
      amountFinanced: l.amountFinanced,
      downPayment: l.downPayment,
      reportedBalance: l.currentBalance,
      maturityDate: l.maturityDate ? l.maturityDate.toISOString() : null,
      monthsRemaining,
      drift:
        l.interestPaidLast12 != null
          ? interestDrift(terms, monthsRemaining, l.interestPaidLast12)
          : null,
    };

    own = ownership({
      purchasePrice: asset.purchasePrice,
      downPayment: l.downPayment,
      loan: terms,
      improvements,
      milesDriven: dep.milesDriven,
      paymentsRemaining: monthsRemaining,
    });
  }

  const vehicleAlerts = loanBlock
    ? alerts({
        depreciation: dep,
        market: mkt,
        loanStatus: loanBlock,
        milesPerYear,
        monthsRemaining,
        normalMilesPerYear: NORMAL_MILES_PER_YEAR,
        latestValuationDate: valuations[0]?.date,
      })
    : [];

  return {
    asset: {
      id: asset.id,
      name: asset.name,
      assetNumber: asset.assetNumber,
      vin: asset.vin,
      yearModel: asset.yearModel,
      purchaseDate: asset.purchaseDate.toISOString(),
      purchasePrice: asset.purchasePrice,
      salvageValue: asset.salvageValue,
      purchaseMileage,
      currentMileage,
      lifetimeMiles,
      lastMileageUpdate: asset.lastMileageUpdate ? asset.lastMileageUpdate.toISOString() : null,
    },
    usage: {
      milesDriven: dep.milesDriven,
      ageYears,
      milesPerYear,
      vsNormalUse: milesPerYear / NORMAL_MILES_PER_YEAR,
    },
    depreciation: dep,
    market: mkt,
    valuations,
    improvements,
    loan: loanBlock,
    ownership: own,
    alerts: vehicleAlerts,
  };
}

/** Cuota mensual de unos terminos sueltos, para simulaciones en la pantalla. */
export { monthlyPayment };
