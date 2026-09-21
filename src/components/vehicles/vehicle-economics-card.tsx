'use client'

import { AlertTriangle, Gauge, Info, TrendingDown, Wallet, Wrench, XCircle } from 'lucide-react'

/**
 * Ficha economica de un vehiculo.
 *
 * El cambio de fondo frente a la pantalla anterior: antes habia un unico
 * "Valor Actual" que en realidad era el valor EN LIBROS, y se leia como si
 * fuera lo que pagaria un dealer. Aqui se muestran los tres valores por
 * separado, cada uno etiquetado con para que sirve, porque responden a
 * preguntas distintas:
 *
 *   LIBROS   -> cuanto vale para la contabilidad y los impuestos
 *   MERCADO  -> cuanto te darian por el hoy
 *   COSTE    -> cuanto llevas gastado de verdad
 *
 * Un numero de mercado que sale de un modelo va siempre marcado como
 * estimacion: confundir una estimacion con una tasacion es peor que no tener
 * ninguna de las dos.
 */

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
const money0 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const miles = (n: number) => `${Math.round(n).toLocaleString('en-US')} mi`

export interface VehicleEconomicsData {
  asset: {
    id: string; name: string; assetNumber: string; vin: string | null
    yearModel: number | null; purchaseDate: string; purchasePrice: number
    salvageValue: number; purchaseMileage: number; currentMileage: number
    lifetimeMiles: number; lastMileageUpdate: string | null
  }
  usage: { milesDriven: number; ageYears: number; milesPerYear: number; vsNormalUse: number }
  depreciation: {
    depreciableBase: number; effectiveLifetimeMiles: number; milesDriven: number
    percentUsed: number; accumulated: number; bookValue: number; perMile: number
    improvementsCapitalized: number
  }
  market: { value: number; basis: 'appraisal' | 'estimate'; ageYears: number; vsBookValue: number
    anchor?: { date: string; value: number; mileage: number; source: string } }
  valuations: Array<{ date: string; value: number; mileage: number; source: string }>
  improvements: Array<{ label: string; date: string; cost: number; addsLifetimeMiles: number
    mileageAtImprovement?: number; componentMiles?: number | null }>
  loan: null | {
    lender: string | null; apr: number; termMonths: number; amountFinanced: number
    downPayment: number; reportedBalance: number | null; maturityDate: string | null
    payoffAmount: number | null; payoffDate: string | null; accruedSincePayment: number | null
    paymentVariance: null | { contract: number; scheduled: number; perMonth: number; overTerm: number; impliedApr: number }
    monthsRemaining: number; monthlyPayment: number; totalOfPayments: number
    actualBalance: number; balanceDrift: number | null
    interestNow: { daily: number; monthly: number; monthly30: number; monthly31: number
      interestPortion: number; principalPortion: number; interestPct: number; averageMonthly: number }
    financeCharge: number; paymentsMade: number; scheduledBalance: number
    interestPaid: number; interestRemaining: number; remainingOutlay: number
    drift: null | { scheduled: number; actual: number; drift: number; driftPct: number; projectedExtra: number }
  }
  ownership: null | {
    downPayment: number; totalOfPayments: number; financeCharge: number; improvements: number
    lifetimeOutlay: number; premiumOverPrice: number; premiumPct: number
    paidToDate: number; costPerMileToDate: number
  }
  alerts: Array<{ level: 'info' | 'warning' | 'danger'; title: string; detail: string }>
}

const ALERT_STYLES = {
  danger: { box: 'border-red-200 bg-red-50', icon: 'text-red-600', title: 'text-red-900', body: 'text-red-800', Icon: XCircle },
  warning: { box: 'border-amber-200 bg-amber-50', icon: 'text-amber-600', title: 'text-amber-900', body: 'text-amber-800', Icon: AlertTriangle },
  info: { box: 'border-blue-200 bg-blue-50', icon: 'text-blue-600', title: 'text-blue-900', body: 'text-blue-800', Icon: Info },
} as const

export function VehicleEconomicsCard({
  data,
  onAddValuation,
  onAddImprovement,
  onEditLoan,
  onUpdateMileage,
}: {
  data: VehicleEconomicsData
  onAddValuation?: () => void
  onAddImprovement?: () => void
  onEditLoan?: () => void
  onUpdateMileage?: () => void
}) {
  const { asset, usage, depreciation: dep, market, loan, ownership: own } = data
  const esTasacion = market.basis === 'appraisal'
  const brechaNegativa = market.vsBookValue < 0

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0D2942]">{asset.name}</h2>
          <p className="text-sm text-gray-500">
            {asset.vin ? `VIN ${asset.vin}` : 'Sin VIN registrado'} · {asset.assetNumber}
          </p>
        </div>
        {onUpdateMileage && (
          <button
            onClick={onUpdateMileage}
            className="rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50"
          >
            <Gauge className="mr-2 inline h-4 w-4" />
            Actualizar millaje
          </button>
        )}
      </div>

      {/* Avisos: lo que la pantalla anterior nunca decia */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a, i) => {
            const s = ALERT_STYLES[a.level]
            return (
              <div key={i} className={`flex gap-3 rounded-xl border p-4 ${s.box}`}>
                <s.Icon className={`h-5 w-5 shrink-0 ${s.icon}`} />
                <div>
                  <p className={`text-sm font-semibold ${s.title}`}>{a.title}</p>
                  <p className={`mt-0.5 text-sm ${s.body}`}>{a.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Los tres valores, separados a proposito */}
      <div className="grid gap-4 md:grid-cols-3">
        <ValueCard
          label="Valor en libros"
          hint="Para contabilidad e impuestos"
          value={money(dep.bookValue)}
          accent="text-[#0D2942]"
          footer={`Base ${money0(dep.depreciableBase)} − ${money0(dep.accumulated)} depreciado`}
        />
        <ValueCard
          label="Valor de mercado"
          hint={esTasacion ? 'Tasación real' : 'Estimación del modelo'}
          value={money(market.value)}
          accent={brechaNegativa ? 'text-red-600' : 'text-[#2CA01C]'}
          badge={
            esTasacion
              ? { text: market.anchor?.source ?? 'Tasación', tone: 'green' as const }
              : { text: 'Estimado', tone: 'amber' as const }
          }
          footer={
            esTasacion && market.anchor
              ? `${market.anchor.source}, ${new Date(market.anchor.date).toLocaleDateString('es')}`
              : 'Sin tasación vigente. Pide una a CarMax o KBB.'
          }
        />
        <ValueCard
          label="Coste real acumulado"
          hint="Lo que llevas desembolsado"
          value={own ? money(own.paidToDate) : '—'}
          accent="text-[#0077C5]"
          footer={own ? `${money(own.costPerMileToDate)} por milla recorrida` : 'Sin financiación registrada'}
        />
      </div>

      {/* Brecha libros vs mercado */}
      {Math.abs(market.vsBookValue) > 100 && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0D2942]">Brecha entre libros y mercado</p>
              <p className="mt-1 text-sm text-gray-600">
                {brechaNegativa
                  ? 'Los libros valoran el vehículo por encima de lo que pagaría el mercado. Normal en uso intensivo: la depreciación contable va más lenta que el castigo por millaje.'
                  : 'El mercado valora el vehículo por encima de los libros.'}
              </p>
            </div>
            <p className={`text-2xl font-bold ${brechaNegativa ? 'text-red-600' : 'text-[#2CA01C]'}`}>
              {market.vsBookValue > 0 ? '+' : ''}{money(market.vsBookValue)}
            </p>
          </div>
        </div>
      )}

      {/* Uso y vida util */}
      <Panel title="Uso y vida útil" icon={<Gauge className="h-5 w-5 text-[#2CA01C]" />}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Odómetro" value={miles(asset.currentMileage)} />
          <Stat label="Recorridas" value={miles(usage.milesDriven)} />
          <Stat
            label="Al año"
            value={miles(usage.milesPerYear)}
            tone={usage.vsNormalUse > 1.5 ? 'warn' : undefined}
            note={`${usage.vsNormalUse.toFixed(1)}× el uso típico`}
          />
          <Stat label="Depreciación" value={`${money(dep.perMile)}/mi`} note="sobre la vida restante" />
        </div>
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-gray-600">Vida útil consumida</span>
            <span className="font-semibold text-[#0D2942]">{dep.percentUsed.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${
                dep.percentUsed > 85 ? 'bg-red-500' : dep.percentUsed > 65 ? 'bg-amber-500' : 'bg-[#2CA01C]'
              }`}
              style={{ width: `${Math.min(100, dep.percentUsed)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {miles(dep.milesDriven)} de {miles(dep.effectiveLifetimeMiles)}
            {dep.improvementsCapitalized > 0 && ' (incluye la extensión por mejoras capitalizadas)'}
          </p>
        </div>
      </Panel>

      {/* Prestamo */}
      {loan ? (
        <Panel
          title={`Financiación${loan.lender ? ` · ${loan.lender}` : ''}`}
          icon={<Wallet className="h-5 w-5 text-[#0077C5]" />}
          action={onEditLoan && { label: 'Editar', onClick: onEditLoan }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Cuota mensual"
              value={money(loan.monthlyPayment)}
              note={loan.paymentVariance ? 'del contrato' : 'calculada'}
            />
            <Stat label="Pagos" value={`${loan.paymentsMade} de ${loan.termMonths}`} note={`${loan.monthsRemaining} restantes`} />
            {loan.payoffAmount != null ? (
              <Stat
                label="Cancelación hoy"
                value={money(loan.payoffAmount)}
                note={
                  loan.reportedBalance != null
                    ? `capital ${money(loan.reportedBalance)} + intereses`
                    : 'capital + intereses devengados'
                }
              />
            ) : (
              <Stat
                label="Saldo"
                value={money(loan.actualBalance)}
                note={loan.reportedBalance != null ? 'según el banco' : 'cuadro teórico'}
              />
            )}
            <Stat
              label="Por desembolsar"
              value={money(loan.remainingOutlay)}
              note={`${loan.monthsRemaining} cuotas de ${money(loan.monthlyPayment)}`}
            />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Stat label="Interés total" value={money(loan.financeCharge)} note={`APR ${(loan.apr * 100).toFixed(2)}%`} />
            <Stat label="Interés ya pagado" value={money(loan.interestPaid)} />
            <Stat label="Interés pendiente" value={money(loan.interestRemaining)} tone="good" />
          </div>

          {/* Lo que cuesta AHORA. Las tres cifras de arriba son del plazo entero
              y no dicen cuanto te esta costando este mes. */}
          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-[#0D2942]">Lo que te cuesta ahora mismo</p>

            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <Stat
                label="Interés este mes"
                value={money(loan.interestNow.monthly)}
                note={`media del plazo: ${money(loan.interestNow.averageMonthly)}`}
              />
              <Stat
                label="Cada día que pasa"
                value={money(loan.interestNow.daily)}
                note={`mes de 30: ${money(loan.interestNow.monthly30)} · de 31: ${money(loan.interestNow.monthly31)}`}
              />
              <Stat
                label="De tu cuota, a interés"
                value={`${loan.interestNow.interestPct.toFixed(1)}%`}
                note={`${money(loan.interestNow.interestPortion)} de ${money(loan.monthlyPayment)}`}
              />
            </div>

            {/* La barra hace visible de un vistazo cuanto de la cuota se evapora */}
            <div className="mt-4">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="bg-amber-500"
                  style={{ width: `${Math.min(100, loan.interestNow.interestPct)}%` }}
                />
                <div className="flex-1 bg-[#2CA01C]" />
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-600">
                <span>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />
                  Interés {money(loan.interestNow.interestPortion)}
                </span>
                <span>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#2CA01C]" />
                  Resto de la cuota {money(loan.interestNow.principalPortion)}
                </span>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              El interés cae a medida que baja el saldo, así que hoy pagas{' '}
              {loan.interestNow.monthly < loan.interestNow.averageMonthly ? 'menos' : 'más'} que la
              media del plazo. Tu contrato lo calcula <em>a diario</em> (cláusula 1.a): un mes de 31
              días cuesta {money(loan.interestNow.monthly31 - loan.interestNow.monthly30)} más que
              uno de 30.
            </p>
          </div>

          {/* Debes mas capital del que el cuadro predijo: el interes diario se lo comio */}
          {loan.balanceDrift != null && loan.balanceDrift > 25 && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Debes {money(loan.balanceDrift)} más de capital del que decía el cuadro
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Tras {loan.paymentsMade} pagos el cuadro de amortización predecía un saldo de{' '}
                {money(loan.scheduledBalance)}, pero el banco reporta{' '}
                <strong>{money(loan.actualBalance)}</strong>. No es un error de nadie: con interés
                diario, parte de cada cuota que debía ir a capital se fue en intereses. Es el mismo
                fenómeno que la desviación de abajo, visto desde el saldo.
              </p>
            </div>
          )}

          {/* La cuota real no coincide con la formula: casi siempre es un cargo fijo */}
          {loan.paymentVariance && Math.abs(loan.paymentVariance.perMonth) > 0.5 && (
            <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-sm font-semibold text-sky-900">
                Pagas {money(loan.paymentVariance.perMonth)} al mes más de lo que da el contrato
              </p>
              <p className="mt-1 text-sm text-sky-800">
                Con {money(loan.amountFinanced)} al {(loan.apr * 100).toFixed(2)}% a {loan.termMonths}{' '}
                meses, la cuota debería ser {money(loan.paymentVariance.scheduled)}, pero el banco
                cobra {money(loan.paymentVariance.contract)}. Son{' '}
                <strong>{money(loan.paymentVariance.overTerm)}</strong> en todo el plazo. Para que
                saliera de un tipo de interés haría falta un{' '}
                {(loan.paymentVariance.impliedApr * 100).toFixed(2)}% — que no es un tipo que nadie
                escriba en un contrato. Apunta a un cargo fijo mensual: búscalo en el desglose de la
                página 1.
              </p>
            </div>
          )}

          {/* La desviacion: interes simple diario castiga los pagos tardios */}
          {loan.drift && loan.drift.drift > 1 && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Pagaste {money(loan.drift.drift)} más de interés del previsto ({loan.drift.driftPct.toFixed(1)}%)
              </p>
              <p className="mt-1 text-sm text-amber-800">
                El banco reporta {money(loan.drift.actual)} en los últimos 12 meses; el cuadro de
                amortización decía {money(loan.drift.scheduled)}. Tu contrato calcula el interés{' '}
                <em>a diario</em> sobre el saldo (cláusula 1.a), así que cada día de retraso corre — y
                el banco aplica cada pago en el orden que elige (cláusula 1.b). Al ritmo actual serían{' '}
                <strong>{money(loan.drift.projectedExtra)}</strong> de más en lo que queda de préstamo.
              </p>
            </div>
          )}
        </Panel>
      ) : (
        <EmptyPanel
          title="Sin financiación registrada"
          body="Registrando el préstamo se puede calcular el coste real del vehículo — no solo el precio de factura — y avisar si debes más de lo que vale."
          action={onEditLoan && { label: 'Registrar financiación', onClick: onEditLoan }}
        />
      )}

      {/* Coste total */}
      {own && (
        <Panel title="Lo que cuesta de verdad" icon={<TrendingDown className="h-5 w-5 text-red-500" />}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Enganche" value={money(own.downPayment)} />
            <Stat label="Total de cuotas" value={money(own.totalOfPayments)} note={`incluye ${money(own.financeCharge)} de interés`} />
            <Stat label="Mejoras" value={money(own.improvements)} />
            <Stat label="Total de por vida" value={money(own.lifetimeOutlay)} tone="warn" />
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Sobre un precio de {money(asset.purchasePrice)}, son{' '}
            <strong className="text-red-600">{money(own.premiumOverPrice)} de sobrecoste</strong>{' '}
            ({own.premiumPct.toFixed(1)}% más). Hasta hoy llevas {money(own.paidToDate)} desembolsados.
          </p>
        </Panel>
      )}

      {/* Tasaciones */}
      <Panel
        title="Tasaciones de mercado"
        icon={<TrendingDown className="h-5 w-5 text-[#2CA01C]" />}
        action={onAddValuation && { label: 'Registrar tasación', onClick: onAddValuation }}
      >
        {data.valuations.length === 0 ? (
          <p className="text-sm text-gray-600">
            No hay ninguna. Una oferta de CarMax o KBB es gratis y tarda unos minutos; registrarla
            sustituye la estimación del modelo por un dato real.
          </p>
        ) : (
          <div className="space-y-2">
            {data.valuations.map((v, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[#0D2942]">{v.source}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(v.date).toLocaleDateString('es')} · {miles(v.mileage)}
                  </p>
                </div>
                <p className="text-lg font-semibold text-[#2CA01C]">{money(v.value)}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Mejoras de capital */}
      <Panel
        title="Mejoras de capital"
        icon={<Wrench className="h-5 w-5 text-[#0077C5]" />}
        action={onAddImprovement && { label: 'Registrar mejora', onClick: onAddImprovement }}
      >
        {data.improvements.length === 0 ? (
          <p className="text-sm text-gray-600">
            Ninguna registrada. Sustituir un componente mayor — un motor, no un cambio de aceite —
            no es gasto del ejercicio: se capitaliza y alarga la vida útil del activo.
          </p>
        ) : (
          <div className="space-y-2">
            {data.improvements.map((m, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[#0D2942]">{m.label}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(m.date).toLocaleDateString('es')}
                    {m.mileageAtImprovement != null && ` · odómetro ${miles(m.mileageAtImprovement)}`}
                    {m.addsLifetimeMiles > 0 && ` · +${miles(m.addsLifetimeMiles)} de vida útil`}
                  </p>
                  {m.componentMiles != null && (
                    <p className="mt-0.5 text-xs text-amber-700">
                      La pieza instalada traía {miles(m.componentMiles)} — no es nueva
                    </p>
                  )}
                </div>
                <p className="text-lg font-semibold text-[#0077C5]">{money(m.cost)}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

/* ---------------------------------------------------------------- piezas */

function ValueCard({
  label, hint, value, accent, footer, badge,
}: {
  label: string; hint: string; value: string; accent: string; footer: string
  badge?: { text: string; tone: 'green' | 'amber' }
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
        </div>
        {badge && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
              badge.tone === 'green' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>
      <p className={`mt-3 text-3xl font-bold ${accent}`}>{value}</p>
      <p className="mt-2 text-xs text-gray-500">{footer}</p>
    </div>
  )
}

function Panel({
  title, icon, action, children,
}: {
  title: string; icon: React.ReactNode
  action?: { label: string; onClick: () => void } | false
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-bold text-[#0D2942]">{title}</h3>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="rounded-lg bg-[#2CA01C] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#108000] hover:shadow-md"
          >
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyPanel({
  title, body, action,
}: {
  title: string; body: string; action?: { label: string; onClick: () => void } | false
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
      <p className="text-sm font-semibold text-[#0D2942]">{title}</p>
      <p className="mx-auto mt-1 max-w-xl text-sm text-gray-600">{body}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-[#2CA01C] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#108000]"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

function Stat({
  label, value, note, tone,
}: {
  label: string; value: string; note?: string; tone?: 'good' | 'warn'
}) {
  const color = tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-[#2CA01C]' : 'text-[#0D2942]'
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold ${color}`}>{value}</p>
      {note && <p className="mt-0.5 text-xs text-gray-400">{note}</p>}
    </div>
  )
}
