/**
 * El texto del aviso de cambio de aceite.
 *
 * El riesgo aqui no es de calculo, es de honestidad: el aviso se dispara sobre
 * un odometro ESTIMADO, y presentar una proyeccion como si fuera una lectura
 * llevaria a cambiar el aceite antes o despues de lo que toca.
 */

import { composeMessage } from '@/lib/vehicle-alerts-service';

const leido = {
  odometer: 143450,
  knownOdometer: 143450,
  daysSinceReading: 0,
  isEstimate: false,
};

const estimado = {
  odometer: 143470,
  knownOdometer: 142800,
  daysSinceReading: 6,
  isEstimate: true,
};

describe('composeMessage cuando falta poco', () => {
  const msg = () =>
    composeMessage({
      vehicle: 'Chevrolet Suburban 2023',
      milesRemaining: 180,
      estimate: estimado,
      nextDueOdometer: 143650,
      intervalMiles: 5000,
    });

  it('el asunto dice cuantas millas faltan', () => {
    expect(msg().title).toContain('180');
    expect(msg().title).not.toMatch(/vencido/i);
  });

  it('nombra el vehiculo', () => {
    expect(msg().body).toContain('Chevrolet Suburban 2023');
  });

  it('dice con que odometro toca el cambio', () => {
    expect(msg().body).toContain('143.650');
  });

  it('declara que la cifra es estimada', () => {
    expect(msg().body).toMatch(/estimaci[oó]n/i);
  });

  it('da la ultima lectura real y cuanto hace de ella', () => {
    const b = msg().body;

    expect(b).toContain('142.800');
    expect(b).toContain('6 días');
  });

  it('pide confirmar mirando el odometro', () => {
    expect(msg().body).toMatch(/confírmalo|confirmalo/i);
  });

  it('recuerda el intervalo configurado', () => {
    expect(msg().body).toContain('5000');
  });
});

describe('composeMessage cuando ya se paso', () => {
  const msg = () =>
    composeMessage({
      vehicle: 'Chevrolet Suburban 2023',
      milesRemaining: -320,
      estimate: estimado,
      nextDueOdometer: 143650,
      intervalMiles: 5000,
    });

  it('el asunto avisa de que esta vencido', () => {
    expect(msg().title).toMatch(/vencido/i);
  });

  it('dice por cuanto se paso, en positivo', () => {
    expect(msg().body).toContain('320');
    expect(msg().body).not.toContain('-320');
  });

  it('sigue declarando que la cifra es estimada', () => {
    expect(msg().body).toMatch(/estimaci[oó]n/i);
  });
});

describe('composeMessage sobre una lectura real', () => {
  const msg = () =>
    composeMessage({
      vehicle: 'Chevrolet Suburban 2023',
      milesRemaining: 200,
      estimate: leido,
      nextDueOdometer: 143650,
      intervalMiles: 5000,
    });

  it('no habla de estimaciones cuando no las hay', () => {
    expect(msg().body).not.toMatch(/estimaci[oó]n/i);
  });

  it('dice que sale de la lectura real', () => {
    expect(msg().body).toMatch(/lectura real/i);
    expect(msg().body).toContain('143.450');
  });

  it('tampoco pide confirmar: ya esta confirmado', () => {
    expect(msg().body).not.toMatch(/confírmalo/i);
  });
});
