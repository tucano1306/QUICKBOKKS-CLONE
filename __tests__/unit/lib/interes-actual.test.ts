/**
 * Lo que cuesta el prestamo AHORA, no a lo largo del plazo.
 *
 * El interes total ($19.588,80), el ya pagado ($14.358,63) y el pendiente
 * ($5.230,17) son cifras del contrato entero. Ninguna responde a "cuanto me
 * esta costando este mes", que es lo que decide si merece la pena adelantar
 * capital.
 *
 * Datos reales: saldo $34.619,67 al 8,90%, cuota $1.097,86.
 */

import { interestNow } from '@/lib/vehicle-economics';

const SALDO = 34619.67;
const APR = 0.089;
const CUOTA = 1097.86;
const COSTE_FINANCIERO = 19588.8;
const PLAZO = 75;

const actual = () => interestNow(APR, SALDO, CUOTA, COSTE_FINANCIERO, PLAZO);

describe('interestNow', () => {
  it('el interes del mes sale del saldo al tipo periodico', () => {
    expect(actual().monthly).toBeCloseTo(256.76, 2);
  });

  it('el interes diario es el de la clausula 1.a: saldo por APR entre 365', () => {
    expect(actual().daily).toBeCloseTo(8.44, 2);
  });

  it('un mes de 31 dias cuesta mas que uno de 30', () => {
    const i = actual();

    expect(i.monthly31).toBeGreaterThan(i.monthly30);
    expect(i.monthly31 - i.monthly30).toBeCloseTo(i.daily, 6);
  });

  it('parte la cuota en interes y resto', () => {
    const i = actual();

    expect(i.interestPortion).toBeCloseTo(256.76, 2);
    expect(i.principalPortion).toBeCloseTo(841.1, 2);
    expect(i.interestPortion + i.principalPortion).toBeCloseTo(CUOTA, 6);
  });

  it('casi una cuarta parte de cada cuota se evapora en intereses', () => {
    expect(actual().interestPct).toBeCloseTo(23.4, 1);
  });

  it('hoy se paga menos que la media del plazo, porque el interes cae con el saldo', () => {
    const i = actual();

    expect(i.averageMonthly).toBeCloseTo(COSTE_FINANCIERO / PLAZO, 2);
    expect(i.monthly).toBeLessThan(i.averageMonthly);
  });

  it('al principio del prestamo se paga muy por encima de la media', () => {
    const alInicio = interestNow(APR, 62750.7, CUOTA, COSTE_FINANCIERO, PLAZO);

    expect(alInicio.monthly).toBeGreaterThan(alInicio.averageMonthly);
    expect(alInicio.interestPct).toBeGreaterThan(actual().interestPct);
  });

  it('con el prestamo saldado no corre ningun interes', () => {
    const saldado = interestNow(APR, 0, CUOTA, COSTE_FINANCIERO, PLAZO);

    expect(saldado.daily).toBe(0);
    expect(saldado.monthly).toBe(0);
    expect(saldado.interestPct).toBe(0);
  });

  it('un saldo negativo no genera intereses negativos', () => {
    expect(interestNow(APR, -500, CUOTA, COSTE_FINANCIERO, PLAZO).daily).toBe(0);
  });

  it('si el interes del mes supera la cuota, no se inventa capital negativo', () => {
    // Prestamo bajo el agua: la cuota no cubre ni los intereses.
    const ahogado = interestNow(0.25, 200000, 100, COSTE_FINANCIERO, PLAZO);

    expect(ahogado.interestPortion).toBe(100);
    expect(ahogado.principalPortion).toBe(0);
    expect(ahogado.interestPct).toBe(100);
  });

  it('sin cuota no se divide por cero', () => {
    expect(interestNow(APR, SALDO, 0, COSTE_FINANCIERO, PLAZO).interestPct).toBe(0);
  });

  it('sin plazo no se divide por cero en la media', () => {
    expect(interestNow(APR, SALDO, CUOTA, COSTE_FINANCIERO, 0).averageMonthly).toBe(0);
  });
});
