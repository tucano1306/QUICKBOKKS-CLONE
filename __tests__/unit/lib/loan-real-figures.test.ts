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
    loanStatus: { scheduledBalance: 34448.79, actualBalance: 34448.79 } as any,
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

describe('el saldo del banco manda sobre el cuadro teorico', () => {
  const CON_CUOTA_REAL: LoanTerms = { ...CONTRATO, contractPayment: 1097.86 };

  it('sin dato del banco se queda con el cuadro', () => {
    const st = loanStatus(CON_CUOTA_REAL, 36);

    expect(st.actualBalance).toBeCloseTo(st.scheduledBalance, 2);
    expect(st.balanceDrift).toBeNull();
  });

  it('con dato del banco, ese es el que manda', () => {
    const st = loanStatus(CON_CUOTA_REAL, 36, 34619.67);

    expect(st.actualBalance).toBe(34619.67);
  });

  it('mide cuanto capital de mas debes frente al cuadro', () => {
    const st = loanStatus(CON_CUOTA_REAL, 36, 34619.67);

    // Debes mas de lo previsto: el interes diario se comio parte del capital.
    expect(st.balanceDrift!).toBeGreaterThan(0);
    expect(st.balanceDrift!).toBeCloseTo(34619.67 - st.scheduledBalance, 2);
  });

  it('un saldo de cero o negativo no se toma como dato del banco', () => {
    expect(loanStatus(CON_CUOTA_REAL, 36, 0).balanceDrift).toBeNull();
    expect(loanStatus(CON_CUOTA_REAL, 36, null).balanceDrift).toBeNull();
  });

  it('lo que falta por desembolsar son las cuotas que quedan a su importe real', () => {
    const st = loanStatus(CON_CUOTA_REAL, 36, 34619.67);

    expect(st.remainingOutlay).toBeCloseTo(36 * 1097.86, 2);
  });

  it('con la cuota teorica el desembolso pendiente es menor: ahi estaba el hueco', () => {
    const real = loanStatus(CON_CUOTA_REAL, 36, 34619.67);
    const teorico = loanStatus(CONTRATO, 36, 34619.67);

    expect(real.remainingOutlay - teorico.remainingOutlay).toBeCloseTo(144, 0);
  });

  it('sin pagos restantes no queda nada por desembolsar', () => {
    expect(loanStatus(CON_CUOTA_REAL, 0, 0).remainingOutlay).toBe(0);
  });
})

describe('las dos cuotas tienen dos trabajos distintos', () => {
  const CON_REAL: LoanTerms = { ...CONTRATO, contractPayment: 1097.86 };

  it('el cuadro sigue el capital con la cuota teorica', () => {
    // Si amortizara los $4,00 extra como capital, el saldo teorico bajaria y
    // el desvio contra el banco pareceria mayor de lo que es. Mientras no se
    // sepa que son esos $4,00, darlos por capital subestima la deuda.
    const conReal = loanStatus(CON_REAL, 36);
    const sinReal = loanStatus(CONTRATO, 36);

    expect(conReal.scheduledBalance).toBeCloseTo(sinReal.scheduledBalance, 2);
  });

  it('el efectivo pendiente si usa la cuota real', () => {
    expect(loanStatus(CON_REAL, 36).remainingOutlay).toBeCloseTo(36 * 1097.86, 2);
    // Sin cuota de contrato sale la formula exacta, no su redondeo a centimos.
    expect(loanStatus(CONTRATO, 36).remainingOutlay).toBeCloseTo(36 * scheduledPayment(CONTRATO), 6);
  });

  it('el desvio de saldo mide la realidad, no mi incertidumbre sobre los $4', () => {
    const st = loanStatus(CON_REAL, 36, 34619.67);

    // 34.619,67 - 34.448,79. Si el cuadro usara la cuota real saldrian ~351.
    expect(st.balanceDrift!).toBeCloseTo(170.88, 1);
  });
})
