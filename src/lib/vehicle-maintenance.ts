/**
 * Control de millas y mantenimiento del vehiculo.
 *
 * Modulo puro: sin base de datos, sin fechas implicitas, sin formato. Todo
 * entra por parametro y sale calculado, para que se pueda probar entero.
 *
 * La idea central es que hay DOS escalas de millas y no se pueden mezclar:
 *
 *   - El ODOMETRO cuenta las millas del chasis. Es lo unico que se puede leer.
 *   - El MOTOR tiene las suyas. Un motor de reemplazo no empieza en cero.
 *
 * En esta camioneta el odometro marcaba 138.650 al salir del taller y el motor
 * instalado traia 15.000 millas propias. El aceite es del motor, pero la
 * lectura es del odometro, asi que hay que convertir entre las dos.
 */

/** Estandar de la casa cuando el vehiculo no define el suyo. */
export const DEFAULT_OIL_CHANGE_INTERVAL = 5000;

/** Punto donde se instalo el motor: ata las dos escalas de millas. */
export interface EngineBaseline {
  /** Odometro el dia de la instalacion. */
  odometer: number;
  /** Millas que ya traia el motor instalado. */
  engineMiles: number;
}

/**
 * Millas del motor para una lectura del odometro.
 *
 * Nunca por debajo de las millas con las que llego: una lectura anterior a la
 * instalacion no significa que el motor rejuveneciera.
 */
export function engineMilesAt(odometer: number, baseline: EngineBaseline): number {
  const driven = Math.max(0, odometer - baseline.odometer);
  return Math.max(0, baseline.engineMiles) + driven;
}

export interface ServiceRecord {
  id: string;
  date: Date;
  odometer: number;
  cost?: number | null;
  vendor?: string | null;
  oilType?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
}

export type ServiceLevel = 'ok' | 'soon' | 'due' | 'overdue';

export interface OilChangeStatus {
  intervalMiles: number;
  /** Odometro del ultimo cambio, o la linea base si no hay ninguno. */
  lastOdometer: number;
  lastDate: Date | null;
  /**
   * No hay ningun cambio registrado y se esta partiendo de la salida del
   * taller. La pantalla debe decirlo: es un supuesto, no un hecho registrado.
   */
  isBaseline: boolean;
  nextDueOdometer: number;
  milesSinceLast: number;
  /** Negativo cuando ya se paso. */
  milesRemaining: number;
  percentUsed: number;
  level: ServiceLevel;
  /** Millas del motor ahora y las que tendra en el proximo cambio. */
  engineMilesNow: number;
  engineMilesAtNextChange: number;
}

export interface OilChangeInput {
  records: ServiceRecord[];
  currentOdometer: number;
  baseline: EngineBaseline;
  intervalMiles?: number | null;
}

/**
 * Donde esta el vehiculo respecto al proximo cambio de aceite.
 *
 * Los umbrales van en porcentaje del intervalo y no en millas fijas, para que
 * sigan teniendo sentido si manana el intervalo pasa a 3.000 o a 7.500.
 */
export function oilChangeStatus(input: OilChangeInput): OilChangeStatus {
  const intervalMiles =
    input.intervalMiles && input.intervalMiles > 0
      ? input.intervalMiles
      : DEFAULT_OIL_CHANGE_INTERVAL;

  // El ultimo por odometro, no por fecha: un registro tardio de un cambio
  // viejo no debe adelantar el contador.
  const sorted = [...input.records].sort((a, b) => a.odometer - b.odometer);
  const last = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  const lastOdometer = last ? last.odometer : input.baseline.odometer;
  const currentOdometer = Math.max(input.currentOdometer, lastOdometer);

  const milesSinceLast = Math.max(0, currentOdometer - lastOdometer);
  const nextDueOdometer = lastOdometer + intervalMiles;
  const milesRemaining = nextDueOdometer - currentOdometer;
  const percentUsed = (milesSinceLast / intervalMiles) * 100;

  return {
    intervalMiles,
    lastOdometer,
    lastDate: last ? last.date : null,
    isBaseline: last === null,
    nextDueOdometer,
    milesSinceLast,
    milesRemaining,
    percentUsed,
    level: levelFor(percentUsed),
    engineMilesNow: engineMilesAt(currentOdometer, input.baseline),
    engineMilesAtNextChange: engineMilesAt(nextDueOdometer, input.baseline),
  };
}

function levelFor(percentUsed: number): ServiceLevel {
  if (percentUsed > 100) return 'overdue';
  if (percentUsed >= 95) return 'due';
  if (percentUsed >= 80) return 'soon';
  return 'ok';
}

/** Un cambio junto al intervalo que de verdad se cumplio hasta el. */
export interface ServiceInterval {
  record: ServiceRecord;
  /** Millas desde el cambio anterior (o desde la linea base para el primero). */
  milesSincePrevious: number;
  /** Positivo si se estiro mas de la cuenta, negativo si se adelanto. */
  vsInterval: number;
  engineMiles: number;
}

/**
 * Historial en orden inverso, con el intervalo cumplido en cada cambio.
 *
 * Es lo que delata si el estandar de 5.000 se esta respetando de verdad o si
 * se esta estirando mes a mes sin darse cuenta.
 */
export function serviceHistory(
  records: ServiceRecord[],
  baseline: EngineBaseline,
  intervalMiles: number = DEFAULT_OIL_CHANGE_INTERVAL
): ServiceInterval[] {
  const sorted = [...records].sort((a, b) => a.odometer - b.odometer);

  const out = sorted.map((record, i) => {
    const previous = i === 0 ? baseline.odometer : sorted[i - 1].odometer;
    const milesSincePrevious = Math.max(0, record.odometer - previous);
    return {
      record,
      milesSincePrevious,
      vsInterval: milesSincePrevious - intervalMiles,
      engineMiles: engineMilesAt(record.odometer, baseline),
    };
  });

  return out.reverse();
}

/** Media de millas entre cambios. Null si aun no hay ninguno. */
export function averageInterval(history: ServiceInterval[]): number | null {
  if (history.length === 0) return null;
  const total = history.reduce((sum, h) => sum + h.milesSincePrevious, 0);
  return total / history.length;
}

/**
 * Cuando toca el proximo, en dias y en fecha.
 *
 * Con un uso intenso el intervalo por millas se agota mucho antes que
 * cualquier recordatorio por meses, y eso conviene verlo.
 */
export interface DueProjection {
  days: number;
  date: Date;
}

export function projectDue(
  milesRemaining: number,
  milesPerYear: number,
  from: Date
): DueProjection | null {
  if (milesPerYear <= 0) return null;
  const days = (milesRemaining / milesPerYear) * 365;
  return {
    days,
    date: new Date(from.getTime() + days * 24 * 60 * 60 * 1000),
  };
}

/** Coste total y por milla de los servicios registrados. */
export interface ServiceCost {
  total: number;
  count: number;
  average: number;
  perMile: number;
}

export function serviceCost(records: ServiceRecord[], milesCovered: number): ServiceCost {
  const withCost = records.filter((r) => r.cost != null && r.cost > 0);
  const total = withCost.reduce((sum, r) => sum + (r.cost as number), 0);

  return {
    total,
    count: withCost.length,
    average: withCost.length > 0 ? total / withCost.length : 0,
    perMile: milesCovered > 0 ? total / milesCovered : 0,
  };
}
