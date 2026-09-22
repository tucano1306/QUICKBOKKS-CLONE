/**
 * Control de millas: cambios de aceite sobre un motor de reemplazo.
 *
 * El caso real: la camioneta salio del taller con el odometro en 138.650 y un
 * motor que ya traia 15.000 millas propias. El estandar es cambiar cada 5.000.
 *
 * El riesgo que cubren estos tests es mezclar las dos escalas: el aceite es
 * del motor, pero la lectura es del odometro.
 */

import {
  DEFAULT_OIL_CHANGE_INTERVAL,
  engineMilesAt,
  oilChangeStatus,
  serviceHistory,
  averageInterval,
  projectDue,
  serviceCost,
  estimateOdometer,
  alertDecision,
  type ServiceRecord,
} from '@/lib/vehicle-maintenance';

const BASE = { odometer: 138650, engineMiles: 15000 };

const rec = (id: string, odometer: number, dia: string, cost?: number): ServiceRecord => ({
  id,
  odometer,
  date: new Date(dia),
  cost: cost ?? null,
});

describe('engineMilesAt', () => {
  it('a la salida del taller el motor tiene sus 15.000', () => {
    expect(engineMilesAt(138650, BASE)).toBe(15000);
  });

  it('cada milla del odometro es una milla del motor', () => {
    expect(engineMilesAt(143650, BASE)).toBe(20000);
  });

  it('una lectura anterior a la instalacion no rejuvenece el motor', () => {
    expect(engineMilesAt(100000, BASE)).toBe(15000);
  });

  it('un motor nuevo de verdad empieza en cero', () => {
    expect(engineMilesAt(138650, { odometer: 138650, engineMiles: 0 })).toBe(0);
  });

  it('no confunde las millas del chasis con las del motor', () => {
    // El chasis lleva 143.650; el motor solo 20.000. Son cosas distintas.
    expect(engineMilesAt(143650, BASE)).not.toBe(143650);
  });
});

describe('oilChangeStatus sin ningun cambio registrado', () => {
  const estado = () =>
    oilChangeStatus({ records: [], currentOdometer: 138650, baseline: BASE });

  it('parte de la salida del taller y lo declara', () => {
    const s = estado();

    expect(s.lastOdometer).toBe(138650);
    expect(s.isBaseline).toBe(true);
  });

  it('el primer cambio toca a las 143.650', () => {
    expect(estado().nextDueOdometer).toBe(143650);
  });

  it('recien salido del taller queda el intervalo entero', () => {
    const s = estado();

    expect(s.milesSinceLast).toBe(0);
    expect(s.milesRemaining).toBe(5000);
    expect(s.level).toBe('ok');
  });

  it('dice cuantas millas tendra el motor en ese cambio', () => {
    expect(estado().engineMilesAtNextChange).toBe(20000);
  });
});

describe('los avisos van por porcentaje del intervalo, no por millas fijas', () => {
  const nivelA = (odometro: number) =>
    oilChangeStatus({ records: [], currentOdometer: odometro, baseline: BASE }).level;

  it('holgado', () => expect(nivelA(141000)).toBe('ok'));
  it('se acerca al 80%', () => expect(nivelA(142650)).toBe('soon'));
  it('toca ya al 95%', () => expect(nivelA(143400)).toBe('due'));
  it('pasado del intervalo', () => expect(nivelA(144000)).toBe('overdue'));

  it('los umbrales siguen valiendo con otro intervalo', () => {
    // Con 3.000 millas, el 80% son 2.400.
    const s = oilChangeStatus({
      records: [],
      currentOdometer: 138650 + 2400,
      baseline: BASE,
      intervalMiles: 3000,
    });

    expect(s.level).toBe('soon');
  });

  it('un intervalo invalido cae al estandar', () => {
    expect(
      oilChangeStatus({ records: [], currentOdometer: 138650, baseline: BASE, intervalMiles: 0 })
        .intervalMiles
    ).toBe(DEFAULT_OIL_CHANGE_INTERVAL);
    expect(
      oilChangeStatus({ records: [], currentOdometer: 138650, baseline: BASE, intervalMiles: -5 })
        .intervalMiles
    ).toBe(DEFAULT_OIL_CHANGE_INTERVAL);
  });
});

describe('oilChangeStatus con cambios ya hechos', () => {
  const records = [rec('a', 143700, '2026-11-05'), rec('b', 148600, '2026-12-20')];

  it('cuenta desde el ultimo cambio, no desde la linea base', () => {
    const s = oilChangeStatus({ records, currentOdometer: 150000, baseline: BASE });

    expect(s.lastOdometer).toBe(148600);
    expect(s.isBaseline).toBe(false);
    expect(s.milesSinceLast).toBe(1400);
    expect(s.nextDueOdometer).toBe(153600);
  });

  it('el ultimo es el de mayor odometro, aunque se registre desordenado', () => {
    const desordenados = [records[1], records[0]];
    const s = oilChangeStatus({ records: desordenados, currentOdometer: 150000, baseline: BASE });

    expect(s.lastOdometer).toBe(148600);
  });

  it('registrar tarde un cambio viejo no adelanta el contador', () => {
    // Se apunta en enero un cambio hecho a las 143.700, ya superado.
    const conRezagado = [...records, rec('c', 143700, '2027-01-15')];
    const s = oilChangeStatus({ records: conRezagado, currentOdometer: 150000, baseline: BASE });

    expect(s.lastOdometer).toBe(148600);
  });

  it('un odometro por debajo del ultimo cambio no da millas negativas', () => {
    const s = oilChangeStatus({ records, currentOdometer: 100, baseline: BASE });

    expect(s.milesSinceLast).toBe(0);
    expect(s.milesRemaining).toBe(5000);
  });

  it('pasado de rosca, las millas restantes salen negativas', () => {
    const s = oilChangeStatus({ records, currentOdometer: 154000, baseline: BASE });

    expect(s.milesRemaining).toBe(-400);
    expect(s.level).toBe('overdue');
  });
});

describe('serviceHistory', () => {
  const records = [
    rec('a', 143700, '2026-11-05', 89.5),
    rec('b', 148600, '2026-12-20', 92),
    rec('c', 154900, '2027-02-01', 95),
  ];

  it('devuelve el mas reciente primero', () => {
    expect(serviceHistory(records, BASE).map((h) => h.record.id)).toEqual(['c', 'b', 'a']);
  });

  it('el primer cambio se mide contra la salida del taller', () => {
    const h = serviceHistory(records, BASE).find((x) => x.record.id === 'a')!;

    expect(h.milesSincePrevious).toBe(143700 - 138650);
  });

  it('delata el intervalo que de verdad se cumplio', () => {
    const h = serviceHistory(records, BASE);

    expect(h.find((x) => x.record.id === 'a')!.vsInterval).toBe(50);
    expect(h.find((x) => x.record.id === 'b')!.vsInterval).toBe(-100);
    // Este se estiro 1.300 millas de mas: justo lo que hay que ver.
    expect(h.find((x) => x.record.id === 'c')!.vsInterval).toBe(1300);
  });

  it('acompana cada cambio con las millas del motor en ese momento', () => {
    const h = serviceHistory(records, BASE).find((x) => x.record.id === 'a')!;

    expect(h.engineMiles).toBe(20050);
  });

  it('sin cambios devuelve una lista vacia, no falla', () => {
    expect(serviceHistory([], BASE)).toEqual([]);
    expect(averageInterval([])).toBeNull();
  });

  it('la media de intervalos revela si se esta estirando el estandar', () => {
    const media = averageInterval(serviceHistory(records, BASE))!;

    expect(media).toBeCloseTo((5050 + 4900 + 6300) / 3, 6);
    expect(media).toBeGreaterThan(DEFAULT_OIL_CHANGE_INTERVAL);
  });
});

describe('projectDue', () => {
  const HOY = new Date('2026-09-21T00:00:00Z');

  it('con uso intenso el intervalo se agota en semanas, no en meses', () => {
    // 40.810 millas al ano: 5.000 millas son menos de mes y medio.
    const p = projectDue(5000, 40810, HOY)!;

    expect(p.days).toBeCloseTo(44.7, 1);
  });

  it('con uso normal el mismo intervalo dura muchisimo mas', () => {
    const intenso = projectDue(5000, 40810, HOY)!;
    const normal = projectDue(5000, 13500, HOY)!;

    expect(normal.days).toBeGreaterThan(intenso.days * 2.5);
  });

  it('si ya se paso, la fecha queda en el pasado', () => {
    const p = projectDue(-400, 40810, HOY)!;

    expect(p.days).toBeLessThan(0);
    expect(p.date.getTime()).toBeLessThan(HOY.getTime());
  });

  it('sin uso no hay proyeccion posible', () => {
    expect(projectDue(5000, 0, HOY)).toBeNull();
    expect(projectDue(5000, -1, HOY)).toBeNull();
  });
});

describe('serviceCost', () => {
  const records = [
    rec('a', 143700, '2026-11-05', 89.5),
    rec('b', 148600, '2026-12-20', 92),
    rec('c', 154900, '2027-02-01'),
  ];

  it('suma solo los que tienen coste', () => {
    const c = serviceCost(records, 16250);

    expect(c.count).toBe(2);
    expect(c.total).toBeCloseTo(181.5, 2);
    expect(c.average).toBeCloseTo(90.75, 2);
  });

  it('calcula el coste por milla', () => {
    expect(serviceCost(records, 16250).perMile).toBeCloseTo(181.5 / 16250, 8);
  });

  it('sin millas recorridas no divide por cero', () => {
    expect(serviceCost(records, 0).perMile).toBe(0);
  });

  it('sin ningun coste registrado todo queda a cero', () => {
    const c = serviceCost([rec('x', 1, '2026-01-01')], 100);

    expect(c.total).toBe(0);
    expect(c.average).toBe(0);
  });
});

// --------------------------------------------------------------- avisos

describe('estimateOdometer', () => {
  const LEIDO = new Date('2026-09-21T00:00:00Z')
  const RITMO = 40804 // millas al ano reales de esta camioneta

  it('el mismo dia de la lectura no proyecta nada', () => {
    const e = estimateOdometer(138650, LEIDO, RITMO, LEIDO)

    expect(e.odometer).toBe(138650)
    expect(e.isEstimate).toBe(false)
  })

  it('proyecta unas 112 millas al dia', () => {
    const e = estimateOdometer(138650, LEIDO, RITMO, new Date('2026-09-22T00:00:00Z'))

    expect(e.projectedMiles).toBeCloseTo(111.8, 1)
    expect(e.isEstimate).toBe(true)
  })

  it('en una semana sin actualizar se acumulan casi 800 millas', () => {
    const e = estimateOdometer(138650, LEIDO, RITMO, new Date('2026-09-28T00:00:00Z'))

    expect(e.projectedMiles).toBeCloseTo(782.8, 0)
    expect(e.daysSinceReading).toBeCloseTo(7, 6)
  })

  it('conserva la lectura real para poder contrastarla', () => {
    const e = estimateOdometer(138650, LEIDO, RITMO, new Date('2026-10-21T00:00:00Z'))

    expect(e.knownOdometer).toBe(138650)
    expect(e.odometer).toBeGreaterThan(e.knownOdometer)
  })

  it('una fecha anterior a la lectura no resta millas', () => {
    const e = estimateOdometer(138650, LEIDO, RITMO, new Date('2026-08-01T00:00:00Z'))

    expect(e.odometer).toBe(138650)
  })

  it('sin ritmo conocido no inventa millas', () => {
    const e = estimateOdometer(138650, LEIDO, 0, new Date('2026-12-01T00:00:00Z'))

    expect(e.odometer).toBe(138650)
    expect(e.isEstimate).toBe(false)
  })
})

describe('alertDecision', () => {
  const status = { nextDueOdometer: 143650 }

  it('no avisa con el intervalo casi entero por delante', () => {
    expect(alertDecision('a1', status, 5000).shouldAlert).toBe(false)
  })

  it('no avisa justo por encima del umbral', () => {
    expect(alertDecision('a1', status, 201).shouldAlert).toBe(false)
  })

  it('avisa al entrar en las 200 millas', () => {
    const d = alertDecision('a1', status, 200)

    expect(d.shouldAlert).toBe(true)
    expect(d.level).toBe('warning')
  })

  it('pasado el cambio sube a peligro', () => {
    const d = alertDecision('a1', status, -50)

    expect(d.shouldAlert).toBe(true)
    expect(d.level).toBe('danger')
  })

  it('el aviso de proximidad y el de vencido son distintos', () => {
    // Si compartieran clave, el segundo nunca llegaria a crearse.
    expect(alertDecision('a1', status, 150).dedupeKey).not.toBe(
      alertDecision('a1', status, -10).dedupeKey
    )
  })

  it('la clave no cambia dia tras dia dentro del mismo cambio', () => {
    expect(alertDecision('a1', status, 180).dedupeKey).toBe(
      alertDecision('a1', status, 60).dedupeKey
    )
  })

  it('tras el cambio, el siguiente estrena clave', () => {
    const siguiente = { nextDueOdometer: 148650 }

    expect(alertDecision('a1', status, 100).dedupeKey).not.toBe(
      alertDecision('a1', siguiente, 100).dedupeKey
    )
  })

  it('cada vehiculo lleva la suya', () => {
    expect(alertDecision('a1', status, 100).dedupeKey).not.toBe(
      alertDecision('a2', status, 100).dedupeKey
    )
  })

  it('se puede pedir un umbral distinto', () => {
    expect(alertDecision('a1', status, 400, 500).shouldAlert).toBe(true)
    expect(alertDecision('a1', status, 400, 300).shouldAlert).toBe(false)
  })

  it('un umbral invalido cae al estandar de 200', () => {
    expect(alertDecision('a1', status, 200, 0).shouldAlert).toBe(true)
    expect(alertDecision('a1', status, 201, -5).shouldAlert).toBe(false)
  })
})
