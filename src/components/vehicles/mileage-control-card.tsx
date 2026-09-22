'use client'

import { Droplet, Gauge, History, Plus, Settings2, Trash2, Wrench } from 'lucide-react'

/**
 * Control de millas de un vehiculo.
 *
 * La pieza central es el anillo: cuanto queda para el proximo cambio de aceite.
 * Todo lo demas lo rodea, porque la pregunta que se viene a responder aqui es
 * una sola -- cuanto falta.
 *
 * El componente no calcula nada. Todo llega resuelto de
 * /api/accounting/vehicle-maintenance.
 */

export interface MaintenanceData {
  asset: {
    id: string
    name: string
    assetNumber: string
    vin: string | null
    currentMileage: number
    lastMileageUpdate: string | null
  }
  baseline: {
    odometer: number
    engineMiles: number
    source: 'improvement' | 'purchase'
    label: string
    date: string | null
  }
  status: {
    intervalMiles: number
    lastOdometer: number
    lastDate: string | null
    isBaseline: boolean
    nextDueOdometer: number
    milesSinceLast: number
    milesRemaining: number
    percentUsed: number
    level: 'ok' | 'soon' | 'due' | 'overdue'
    engineMilesNow: number
    engineMilesAtNextChange: number
  }
  history: Array<{
    record: {
      id: string
      date: string
      odometer: number
      cost: number | null
      vendor: string | null
      oilType: string | null
      notes: string | null
      photoUrl: string | null
    }
    milesSincePrevious: number
    vsInterval: number
    engineMiles: number
  }>
  averageIntervalMiles: number | null
  projection: { days: number; date: string } | null
  milesPerYear: number
  cost: { total: number; count: number; average: number; perMile: number }
}

const miles = (n: number) => `${Math.round(n).toLocaleString('es')} mi`
const money = (n: number) =>
  `$${n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const day = (iso: string) => new Date(iso).toLocaleDateString('es')

const TONE = {
  ok: { ring: '#2CA01C', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900' },
  soon: { ring: '#D97706', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900' },
  due: { ring: '#EA580C', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900' },
  overdue: { ring: '#DC2626', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900' },
} as const

const HEADLINE = {
  ok: 'Todo en orden',
  soon: 'Se acerca el cambio',
  due: 'Toca cambiar el aceite',
  overdue: 'Cambio de aceite vencido',
} as const

export function MileageControlCard({
  data,
  onAddService,
  onEditInterval,
  onUpdateMileage,
  onDeleteRecord,
}: Readonly<{
  data: MaintenanceData
  onAddService?: () => void
  onEditInterval?: () => void
  onUpdateMileage?: () => void
  onDeleteRecord?: (id: string) => void
}>) {
  const { asset, baseline, status, history, projection } = data
  const tone = TONE[status.level]

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0D2942] sm:text-2xl">{asset.name}</h2>
          <p className="text-sm text-gray-500">
            {asset.vin ? `VIN ${asset.vin} · ` : ''}
            {asset.assetNumber}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onUpdateMileage && (
            <button
              type="button"
              onClick={onUpdateMileage}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Gauge className="h-4 w-4" />
              Actualizar millaje
            </button>
          )}
          {onAddService && (
            <button
              type="button"
              onClick={onAddService}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2CA01C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#248016]"
            >
              <Plus className="h-4 w-4" />
              Registrar cambio
            </button>
          )}
        </div>
      </div>

      {/* El anillo: cuanto falta */}
      <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-5 sm:p-7`}>
        <div className="flex flex-col items-center gap-7 sm:flex-row sm:items-center">
          <ProgressRing percent={status.percentUsed} color={tone.ring} level={status.level} />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className={`text-lg font-bold ${tone.text}`}>{HEADLINE[status.level]}</p>

            <p className="mt-1 text-3xl font-bold text-[#0D2942]">
              {status.milesRemaining >= 0
                ? `Faltan ${miles(status.milesRemaining)}`
                : `Pasado por ${miles(Math.abs(status.milesRemaining))}`}
            </p>

            <p className="mt-2 text-sm text-gray-700">
              Llevas <strong>{miles(status.milesSinceLast)}</strong> de las{' '}
              {miles(status.intervalMiles)} del intervalo. El próximo toca con el odómetro en{' '}
              <strong>{miles(status.nextDueOdometer)}</strong>.
            </p>

            {projection && (
              <p className="mt-2 text-sm text-gray-600">
                {projection.days >= 0 ? (
                  <>
                    A tu ritmo actual serían unos <strong>{Math.round(projection.days)} días</strong>
                    , sobre el {day(projection.date)}.
                  </>
                ) : (
                  <>
                    Deberías haberlo hecho hace unos{' '}
                    <strong>{Math.abs(Math.round(projection.days))} días</strong>, sobre el{' '}
                    {day(projection.date)}.
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Las dos escalas de millas */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-[#0077C5]" />
          <h3 className="font-semibold text-[#0D2942]">Odómetro y motor no cuentan lo mismo</h3>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Stat
            label="Odómetro"
            value={miles(asset.currentMileage)}
            note={
              asset.lastMileageUpdate
                ? `actualizado el ${day(asset.lastMileageUpdate)}`
                : 'sin actualizar'
            }
          />
          <Stat
            label="Millas del motor"
            value={miles(status.engineMilesNow)}
            note={`traía ${miles(baseline.engineMiles)} al instalarse`}
            highlight
          />
          {/* Vencido, el "proximo" cambio esta en el pasado: con la etiqueta de
              futuro salia una cifra menor que las millas actuales y no se
              entendia nada. */}
          <Stat
            label={status.milesRemaining < 0 ? 'Debió cambiarse con' : 'En el próximo cambio'}
            value={miles(status.engineMilesAtNextChange)}
            note={
              status.milesRemaining < 0
                ? `millas del motor · hace ${miles(Math.abs(status.milesRemaining))}`
                : 'millas del motor'
            }
          />
        </div>

        <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          {baseline.source === 'improvement' ? (
            <>
              El odómetro marca las millas del chasis. El motor instalado
              {baseline.date ? ` el ${day(baseline.date)}` : ''} traía{' '}
              <strong>{miles(baseline.engineMiles)}</strong> propias con el odómetro en{' '}
              {miles(baseline.odometer)}, así que desde entonces las dos cuentas van separadas{' '}
              <strong>{miles(baseline.odometer - baseline.engineMiles)}</strong>. El aceite es del
              motor; la lectura, del odómetro.
            </>
          ) : (
            <>
              Motor de fábrica: odómetro y motor cuentan lo mismo desde la compra.
            </>
          )}
        </p>
      </div>

      {/* Referencia e intervalo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel
          label="Intervalo"
          value={miles(status.intervalMiles)}
          note="entre cambios"
          action={onEditInterval && { label: 'Cambiar', onClick: onEditInterval }}
        />
        <Panel
          label="Última referencia"
          value={miles(status.lastOdometer)}
          note={
            status.isBaseline
              ? 'salida del taller — aún sin cambios registrados'
              : status.lastDate
                ? `cambio del ${day(status.lastDate)}`
                : 'último cambio'
          }
          warn={status.isBaseline}
        />
        <Panel
          label="Intervalo real medio"
          value={data.averageIntervalMiles != null ? miles(data.averageIntervalMiles) : '—'}
          note={
            data.averageIntervalMiles != null
              ? data.averageIntervalMiles > status.intervalMiles
                ? `${miles(data.averageIntervalMiles - status.intervalMiles)} por encima del estándar`
                : 'dentro del estándar'
              : 'aún sin historial'
          }
          warn={
            data.averageIntervalMiles != null && data.averageIntervalMiles > status.intervalMiles
          }
        />
        <Panel
          label="Gasto en aceite"
          value={data.cost.count > 0 ? money(data.cost.total) : '—'}
          note={
            data.cost.count > 0
              ? `${data.cost.count} cambios · ${money(data.cost.average)} de media`
              : 'sin costes registrados'
          }
        />
      </div>

      {/* Historial */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-[#0077C5]" />
          <h3 className="font-semibold text-[#0D2942]">Historial de cambios</h3>
          {history.length > 0 && (
            <span className="ml-auto text-sm text-gray-500">{history.length}</span>
          )}
        </div>

        {history.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <Droplet className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-[#0D2942]">Aún no hay ningún cambio</p>
            <p className="mt-1 text-sm text-gray-600">
              El control parte de la salida del taller, con el odómetro en{' '}
              {miles(baseline.odometer)}. Registra el primer cambio cuando lo hagas.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {history.map((h) => (
              <li
                key={h.record.id}
                className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 px-4 py-3"
              >
                <Droplet className="h-5 w-5 shrink-0 text-[#0077C5]" />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#0D2942]">
                    {miles(h.record.odometer)}
                    <span className="ml-2 font-normal text-gray-500">
                      · motor {miles(h.engineMiles)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {day(h.record.date)}
                    {h.record.vendor ? ` · ${h.record.vendor}` : ''}
                    {h.record.oilType ? ` · ${h.record.oilType}` : ''}
                    {' · '}
                    {miles(h.milesSincePrevious)} desde el anterior
                  </p>
                  {h.record.notes && (
                    <p className="mt-0.5 text-xs text-gray-500">{h.record.notes}</p>
                  )}
                </div>

                <IntervalBadge vsInterval={h.vsInterval} />

                {h.record.cost != null && (
                  <span className="text-sm font-semibold text-[#0D2942]">
                    {money(h.record.cost)}
                  </span>
                )}

                {onDeleteRecord && (
                  <button
                    type="button"
                    onClick={() => onDeleteRecord(h.record.id)}
                    aria-label="Borrar este registro"
                    className="rounded p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Anillo de progreso. Pasado el 100% se llena y cambia de color, no se desborda. */
function ProgressRing({
  percent,
  color,
  level,
}: Readonly<{ percent: number; color: string; level: string }>) {
  const size = 150
  const stroke = 13
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const shown = Math.max(0, Math.min(100, percent))
  const offset = circumference - (shown / 100) * circumference

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-[#0D2942]">{Math.round(percent)}%</span>
        <span className="text-xs font-medium text-gray-500">
          {level === 'overdue' ? 'excedido' : 'del intervalo'}
        </span>
      </div>
    </div>
  )
}

/** Cuanto se estiro o se adelanto un cambio frente al estandar. */
function IntervalBadge({ vsInterval }: Readonly<{ vsInterval: number }>) {
  if (Math.abs(vsInterval) < 250) {
    return (
      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
        en punto
      </span>
    )
  }
  if (vsInterval > 0) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
        +{miles(vsInterval)} de más
      </span>
    )
  }
  return (
    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
      {miles(Math.abs(vsInterval))} antes
    </span>
  )
}

function Stat({
  label,
  value,
  note,
  highlight,
}: Readonly<{ label: string; value: string; note?: string; highlight?: boolean }>) {
  return (
    <div className={highlight ? 'rounded-lg bg-blue-50 p-3' : 'p-3'}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#0D2942]">{value}</p>
      {note && <p className="mt-0.5 text-xs text-gray-500">{note}</p>}
    </div>
  )
}

function Panel({
  label,
  value,
  note,
  warn,
  action,
}: Readonly<{
  label: string
  value: string
  note?: string
  warn?: boolean
  action?: { label: string; onClick: () => void } | false
}>) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#0077C5] transition hover:underline"
          >
            <Settings2 className="h-3 w-3" />
            {action.label}
          </button>
        )}
      </div>
      <p className="mt-1 text-2xl font-bold text-[#0D2942]">{value}</p>
      {note && (
        <p className={`mt-0.5 text-xs ${warn ? 'text-amber-700' : 'text-gray-500'}`}>{note}</p>
      )}
    </div>
  )
}
