import { prisma } from '@/lib/prisma';
import {
  DEFAULT_ALERT_MILES,
  alertDecision,
  estimateOdometer,
} from '@/lib/vehicle-maintenance';
import { getVehicleMaintenance } from '@/lib/vehicle-maintenance-service';

/**
 * Deteccion de cambios de aceite proximos y creacion de avisos.
 *
 * Lo ejecuta el trabajo diario. El odometro se ESTIMA a partir de la ultima
 * lectura y del ritmo real, porque esperar a que alguien lo escriba es esperar
 * a que el aviso llegue tarde: a 112 millas al dia, una semana sin actualizar
 * son casi 800 millas.
 *
 * Todo aviso estimado lo dice en su propio texto. Un numero proyectado
 * presentado como leido seria peor que no dar ninguno.
 */

export interface AlertRun {
  checked: number;
  created: number;
  skipped: number;
  details: string[];
}

export async function runOilChangeAlerts(asOf: Date = new Date()): Promise<AlertRun> {
  const run: AlertRun = { checked: 0, created: 0, skipped: 0, details: [] };

  const assets = await prisma.asset.findMany({
    where: { category: 'VEHICLE', status: { not: 'DISPOSED' } },
    select: { id: true, name: true, companyId: true, serviceAlertMiles: true },
  });

  for (const asset of assets) {
    run.checked += 1;

    const data = await getVehicleMaintenance(asset.id, asOf);
    if (!data) continue;

    // El odometro proyectado a hoy desde la ultima lectura conocida.
    const readingDate = data.asset.lastMileageUpdate
      ? new Date(data.asset.lastMileageUpdate)
      : asOf;
    const estimate = estimateOdometer(
      data.asset.currentMileage,
      readingDate,
      data.milesPerYear,
      asOf
    );

    const milesRemaining = data.status.nextDueOdometer - estimate.odometer;
    const alertMiles = asset.serviceAlertMiles ?? DEFAULT_ALERT_MILES;
    const decision = alertDecision(asset.id, data.status, milesRemaining, alertMiles);

    if (!decision.shouldAlert) {
      run.skipped += 1;
      continue;
    }

    // Avisa a todos los miembros de la empresa duena del activo.
    const recipients = asset.companyId
      ? await prisma.companyUser.findMany({
          where: { companyId: asset.companyId },
          select: { userId: true },
        })
      : [];

    if (recipients.length === 0) {
      run.details.push(`${asset.name}: sin destinatarios`);
      continue;
    }

    const { title, body } = composeMessage({
      vehicle: asset.name,
      milesRemaining,
      estimate,
      nextDueOdometer: data.status.nextDueOdometer,
      intervalMiles: data.status.intervalMiles,
    });

    for (const r of recipients) {
      // El indice unico (userId, dedupeKey) es lo que impide repetir el mismo
      // aviso cada dia. createMany con skipDuplicates lo aprovecha en vez de
      // consultar antes, que dejaria una carrera abierta.
      const res = await prisma.notification.createMany({
        data: [
          {
            userId: r.userId,
            companyId: asset.companyId,
            type: 'OIL_CHANGE_DUE',
            level: decision.level,
            title,
            body,
            link: '/company/accounting/mileage-control',
            dedupeKey: decision.dedupeKey,
          },
        ],
        skipDuplicates: true,
      });

      if (res.count > 0) run.created += 1;
      else run.skipped += 1;
    }

    run.details.push(
      `${asset.name}: ${Math.round(milesRemaining)} mi restantes (${decision.level})`
    );
  }

  return run;
}

interface MessageInput {
  vehicle: string;
  milesRemaining: number;
  estimate: { odometer: number; knownOdometer: number; daysSinceReading: number; isEstimate: boolean };
  nextDueOdometer: number;
  intervalMiles: number;
}

/**
 * El texto del aviso.
 *
 * Separa siempre lo leido de lo estimado, y pide confirmar con el odometro
 * real: la estimacion sirve para avisar a tiempo, no para sustituir la lectura.
 */
export function composeMessage(input: MessageInput): { title: string; body: string } {
  const mi = (n: number) => `${Math.round(n).toLocaleString('es')} mi`;
  const vencido = input.milesRemaining < 0;

  const title = vencido
    ? `Cambio de aceite vencido: ${input.vehicle}`
    : `Faltan ${mi(input.milesRemaining)} para el cambio de aceite`;

  const partes = [
    vencido
      ? `El cambio de aceite de tu ${input.vehicle} tocaba con el odómetro en ${mi(input.nextDueOdometer)} y ya se ha pasado por unas ${mi(Math.abs(input.milesRemaining))}.`
      : `Al ${input.vehicle} le quedan unas ${mi(input.milesRemaining)} para el próximo cambio de aceite, previsto con el odómetro en ${mi(input.nextDueOdometer)}.`,
  ];

  if (input.estimate.isEstimate) {
    partes.push(
      `Este número es una estimación: la última lectura real fue ${mi(input.estimate.knownOdometer)} hace ${Math.round(input.estimate.daysSinceReading)} días, y a tu ritmo el odómetro estaría hoy sobre ${mi(input.estimate.odometer)}. Confírmalo mirando el odómetro.`
    );
  } else {
    partes.push(`Calculado sobre la lectura real de ${mi(input.estimate.knownOdometer)}.`);
  }

  partes.push(`El intervalo configurado es de ${mi(input.intervalMiles)} entre cambios.`);

  return { title, body: partes.join(' ') };
}
