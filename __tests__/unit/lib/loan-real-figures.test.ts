/**
 * Cifras reales frente a cifras modeladas, en el prestamo.
 *
 * Los datos son los del contrato real: $62.750,70 al 8,90% a 75 meses. La
 * formula da $1.093,86 al mes; el banco cobra $1.097,86. Cuatro dolares
 * exactos de diferencia, que en 75 meses son $300.
 *
 * Tambien: la app del banco da "payoff" $34.754,74 y el estado de cuenta da
 * saldo de capital $34.619,67. No se contradicen -- la diferencia son los
 * intereses devengados desde el ultimo pago.
 */

import {
  monthlyPayment,
  scheduledPayment,
  paymentVariance,
  loanStatus,
  alerts,
  type LoanTerms,
} from '@/lib/vehicle-economics';

const CONTRATO: LoanTerms = {
  amountFinanced: 62750.7,
  apr: 0.089,
  termMonths: 75,
};

describe('la cuota del contrato manda sobre la formula', () => {
  it('sin cuota declarada usa la formula', () => {
    expect(monthlyPayment(CONTRATO)).toBeCloseTo(1093.86, 2);
  });

  it('con cuota declarada devuelve exactamente esa', () => {
    expect(monthlyPayment({ ...CONTRATO, contractPayment: 1097.86 })).toBe(1097.86);
  });

  it('scheduledPayment sigue dando la teorica aunque haya contrato', () => {
    expect(scheduledPayment({ ...CONTRATO, contractPayment: 1097.86 })).toBeCloseTo(1093.86, 2);
  });

  it('una cuota a cero o negativa no se toma en serio', () => {
    expect(monthlyPayment({ ...CONTRATO, contractPayment: 0 })).toBeCloseTo(1093.86, 2);
    expect(monthlyPayment({ ...CONTRATO, contractPayment: -5 })).toBeCloseTo(1093.86, 2);
  });

  it('la cuota real arrastra el total pagado y el coste financiero', () => {
    const teorico = loanStatus(CONTRATO, 36);
    const real = loanStatus({ ...CONTRATO, contractPayment: 1097.86 }, 36);

    expect(real.totalOfPayments - teorico.totalOfPayments).toBeCloseTo(300, 0);
    expect(real.financeCharge - teorico.financeCharge).toBeCloseTo(300, 0);
  });
});

describe('paymentVariance', () => {
  it('sin cuota de contrato no hay nada que comparar', () => {
    expect(paymentVariance(CONTRATO)).toBeNull();
  });

  it('mide los cuatro dolares y los trescientos del plazo', () => {
    const v = paymentVariance({ ...CONTRATO, contractPayment: 1097.86 })!;

    expect(v.perMonth).toBeCloseTo(4.0, 2);
    expect(v.overTerm).toBeCloseTo(300, 0);
  });

  it('el APR implicito no es un tipo que nadie escriba en un contrato', () => {
    const v = paymentVariance({ ...CONTRATO, contractPayment: 1097.86 })!;

    // ~9,03%. Que no sea un tipo redondo es justo el argumento: la diferencia
    // no viene del interes, viene de un cargo fijo mensual.
    expect(v.impliedApr).toBeGreaterThan(0.09);
    expect(v.impliedApr).toBeLessThan(0.091);
  });

  it('si la cuota real coincide con la teorica la desviacion es cero', () => {
    const v = paymentVariance({ ...CONTRATO, contractPayment: scheduledPayment(CONTRATO) })!;

    expect(v.perMonth).toBeCloseTo(0, 6);
    expect(v.impliedApr).toBeCloseTo(0.089, 4);
  });
});

describe('el aviso de "debes mas de lo que vale" usa la cancelacion real', () => {
  const base = {
    depreciation: { effectiveLifetimeMiles: 260000, milesDriven: 138647 } as any,
    market: { value: 33936.65, vsBookValue: -4578 } as any,
    loanStatus: { scheduledBalance: 34448.79 } as any,
    milesPerYear: 40810,
    monthsRemaining: 36,
  };

  it('sin payoff se mide contra el saldo de capital', () => {
    const a = alerts(base).find((x) => x.title === 'Debes mas de lo que vale')!;

    expect(a.detail).toContain('Saldo');
    expect(a.detail).toContain('34,448.79');
  });

  it('con payoff se mide contra lo que de verdad libera el titulo', () => {
    const a = alerts({ ...base, payoffAmount: 34754.74 }).find(
      (x) => x.title === 'Debes mas de lo que vale'
    )!;

    expect(a.detail).toContain('Cancelacion');
    expect(a.detail).toContain('34,754.74');
  });

  it('la cancelacion agranda el agujero, no lo maquilla', () => {
    const conSaldo = alerts(base).find((x) => x.title === 'Debes mas de lo que vale')!;
    const conPayoff = alerts({ ...base, payoffAmount: 34754.74 }).find(
      (x) => x.title === 'Debes mas de lo que vale'
    )!;

    expect(conPayoff.detail).not.toEqual(conSaldo.detail);
  });
});

describe('payoff y saldo de capital son cifras distintas y compatibles', () => {
  it('la diferencia son los intereses devengados desde el ultimo pago', () => {
    const saldo = 34619.67;
    const payoff = 34754.74;
    const devengado = payoff - saldo;
    const diario = (saldo * 0.089) / 365;

    expect(devengado).toBeCloseTo(135.07, 2);
    // 16 dias exactos: las dos cifras del banco se confirman entre si.
    expect(devengado / diario).toBeCloseTo(16, 0);
  });
});
