import { prisma } from '@/lib/prisma';
import {
  DEFAULT_OIL_CHANGE_INTERVAL,
  averageInterval,
  oilChangeStatus,
  projectDue,
  serviceCost,
  serviceHistory,
  type DueProjection,
  type EngineBaseline,
  type OilChangeStatus,
  type ServiceCost,
  type ServiceInterval,
  type ServiceRecord,
} from '@/lib/vehicle-maintenance';

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export interface VehicleMaintenance {
  asset: {
    id: string;
    name: string;
    assetNumber: string;
    vin: string | null;
    currentMileage: number;
    lastMileageUpdate: string | null;
  };
  /** De donde sale la linea base del motor, para poder explicarla en pantalla. */
  baseline: EngineBaseline & {
    source: 'improvement' | 'purchase';
    label: string;
    date: string | null;
  };
  status: OilChangeStatus;
  history: ServiceInterval[];
  averageIntervalMiles: number | null;
  projection: DueProjection | null;
  milesPerYear: number;
  cost: ServiceCost;
}

/**
 * Estado de mantenimiento de un vehiculo.
 *
 * La linea base del motor sale de la mejora capitalizada cuando existe -- ahi
 * estan el odometro del cambio y las millas que traia la pieza. Si no hay
 * ninguna, el motor es el de fabrica y se parte de la compra.
 */
export async function getVehicleMaintenance(
  assetId: string,
  asOf: Date = new Date()
): Promise<VehicleMaintenance | null> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      serviceRecords: { orderBy: { odometer: 'asc' } },
      improvements: { orderBy: { date: 'asc' } },
    },
  });
  if (!asset) return null;

  const purchaseMileage = asset.purchaseMileage ?? 0;
  const currentMileage = asset.currentMileage ?? purchaseMileage;

  const baseline = engineBaselineFor(asset, purchaseMileage);

  const records: ServiceRecord[] = asset.serviceRecords.map((r) => ({
    id: r.id,
    date: r.date,
    odometer: r.odometer,
    cost: r.cost,
    vendor: r.vendor,
    oilType: r.oilType,
    notes: r.notes,
    photoUrl: r.photoUrl,
  }));

  const intervalMiles = asset.serviceIntervalMiles ?? DEFAULT_OIL_CHANGE_INTERVAL;

  const status = oilChangeStatus({
    records,
    currentOdometer: currentMileage,
    baseline,
    intervalMiles,
  });

  const history = serviceHistory(records, baseline, intervalMiles);

  const ageYears = Math.max(
    0.01,
    (asOf.getTime() - asset.purchaseDate.getTime()) / MS_PER_YEAR
  );
  const milesPerYear = Math.max(0, currentMileage - purchaseMileage) / ageYears;

  return {
    asset: {
      id: asset.id,
      name: asset.name,
      assetNumber: asset.assetNumber,
      vin: asset.vin,
      currentMileage,
      lastMileageUpdate: asset.lastMileageUpdate
        ? asset.lastMileageUpdate.toISOString()
        : null,
    },
    baseline,
    status,
    history,
    averageIntervalMiles: averageInterval(history),
    projection: projectDue(status.milesRemaining, milesPerYear, asOf),
    milesPerYear,
    cost: serviceCost(records, Math.max(0, currentMileage - baseline.odometer)),
  };
}

type AssetWithImprovements = {
  purchaseDate: Date;
  improvements: Array<{
    label: string;
    date: Date;
    mileageAtImprovement: number | null;
    componentMiles: number | null;
  }>;
};

/**
 * La mejora que reemplazo el motor, si la hay.
 *
 * Se reconoce por tener millas propias de componente: eso solo se registra
 * cuando la pieza instalada es de segunda mano, que es justo el caso en el que
 * las dos escalas de millas se separan.
 */
function engineBaselineFor(
  asset: AssetWithImprovements,
  purchaseMileage: number
): VehicleMaintenance['baseline'] {
  const engineSwap = [...asset.improvements]
    .reverse()
    .find((i) => i.componentMiles != null && i.mileageAtImprovement != null);

  if (engineSwap) {
    return {
      odometer: engineSwap.mileageAtImprovement as number,
      engineMiles: engineSwap.componentMiles as number,
      source: 'improvement',
      label: engineSwap.label,
      date: engineSwap.date.toISOString(),
    };
  }

  return {
    odometer: purchaseMileage,
    engineMiles: 0,
    source: 'purchase',
    label: 'Motor de fabrica',
    date: asset.purchaseDate.toISOString(),
  };
}
