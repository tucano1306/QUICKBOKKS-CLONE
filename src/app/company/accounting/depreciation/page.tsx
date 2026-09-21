'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, Car } from 'lucide-react'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import {
  VehicleEconomicsCard,
  type VehicleEconomicsData,
} from '@/components/vehicles/vehicle-economics-card'

/**
 * Detalle economico de los vehiculos.
 *
 * Sustituye a la pantalla de depreciacion, que mostraba un unico "Valor
 * Actual" -- en realidad el valor en libros -- y se leia como si fuera lo que
 * pagaria un dealer. Ahora libros, mercado y coste real van separados, y todo
 * el calculo llega ya resuelto desde /api/accounting/vehicle-economics: la
 * pantalla no hace aritmetica.
 */

type Modal = 'valuation' | 'improvement' | 'loan' | 'mileage' | null

/** Otra empresa del usuario que si tiene vehiculos, para no acabar duplicandolos. */
interface OtherCompany {
  id: string
  name: string
  vehicleCount: number
}

export default function VehicleDetailsPage() {
  const { status } = useSession()
  const router = useRouter()
  const { activeCompany, companies, setActiveCompany } = useCompany()

  const [vehicles, setVehicles] = useState<VehicleEconomicsData[]>([])
  const [elsewhere, setElsewhere] = useState<OtherCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchData = useCallback(async () => {
    if (!activeCompany) return
    try {
      setLoading(true)
      const res = await fetch(`/api/accounting/vehicle-economics?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setVehicles(data.vehicles || [])
        setElsewhere(data.otherCompanies || [])
      } else {
        const err = await res.json().catch(() => null)
        setMessage({ type: 'error', text: err?.error || 'No se pudieron cargar los vehículos' })
      }
    } catch {
      setMessage({ type: 'error', text: 'No se pudieron cargar los vehículos' })
    } finally {
      setLoading(false)
    }
  }, [activeCompany])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
  }, [status, router])

  useEffect(() => {
    if (activeCompany) fetchData()
  }, [activeCompany, fetchData])

  const open = (m: Modal, assetId: string) => {
    setActiveId(assetId)
    setModal(m)
  }

  const submit = async (url: string, method: string, body: Record<string, unknown>, ok: string) => {
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, assetId: activeId }),
      })
      if (res.ok) {
        setModal(null)
        setMessage({ type: 'success', text: ok })
        await fetchData()
        setTimeout(() => setMessage(null), 4000)
      } else {
        const err = await res.json().catch(() => null)
        setMessage({ type: 'error', text: err?.error || 'No se pudo guardar' })
      }
    } catch {
      setMessage({ type: 'error', text: 'No se pudo guardar' })
    }
  }

  return (
    <CompanyTabsLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#2CA01C]/10 p-2.5">
            <Car className="h-6 w-6 text-[#2CA01C]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0D2942]">Vehículo detalles</h1>
            <p className="text-sm text-gray-500">
              Valor en libros, valor de mercado y coste real de cada vehículo
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 rounded-lg p-4 text-sm ${
              message.type === 'success'
                ? 'border border-green-200 bg-green-50 text-green-800'
                : 'border border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <p className="text-gray-500">Calculando…</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center sm:p-12">
            <Car className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-3 font-semibold text-[#0D2942]">
              {activeCompany?.name
                ? `${activeCompany.name} no tiene vehículos registrados`
                : 'No hay vehículos registrados'}
            </p>

            {elsewhere.length > 0 ? (
              <>
                <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
                  Pero sí los tienes en{' '}
                  {elsewhere.length === 1 ? 'otra empresa' : 'otras empresas'}. Cambia de empresa
                  para verlos — si lo das de alta aquí acabarás con el mismo vehículo duplicado.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {elsewhere.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        const target = companies.find((x) => x.id === c.id)
                        if (target) setActiveCompany(target)
                      }}
                      className="rounded-lg bg-[#2CA01C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#248016]"
                    >
                      Ver en {c.name}
                      <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-xs">
                        {c.vehicleCount}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-gray-600">
                Los vehículos se dan de alta como activos de categoría VEHICLE.
              </p>
            )}
          </div>
        ) : (
          vehicles.map((v) => (
            <div key={v.asset.id} className="rounded-2xl bg-gray-50/60 p-4 sm:p-6">
              <VehicleEconomicsCard
                data={v}
                onAddValuation={() => open('valuation', v.asset.id)}
                onAddImprovement={() => open('improvement', v.asset.id)}
                onEditLoan={() => open('loan', v.asset.id)}
                onUpdateMileage={() => open('mileage', v.asset.id)}
              />
            </div>
          ))
        )}
      </div>

      {modal === 'valuation' && (
        <FormModal
          title="Registrar tasación"
          hint="El dato que ninguna fórmula puede producir: lo que un dealer o CarMax pagaría de verdad. Sustituye la estimación del modelo."
          fields={[
            { name: 'source', label: 'Fuente', placeholder: 'CarMax, KBB, Dealer Chevrolet…', required: true },
            { name: 'value', label: 'Valor tasado ($)', type: 'number', required: true },
            { name: 'mileage', label: 'Millaje en ese momento', type: 'number', required: true,
              hint: 'Sin esto no se puede extrapolar cuando la tasación envejezca' },
            { name: 'date', label: 'Fecha de la tasación', type: 'date' },
            { name: 'notes', label: 'Notas', type: 'textarea' },
          ]}
          onCancel={() => setModal(null)}
          onSubmit={(v) =>
            submit('/api/accounting/vehicle-economics/valuations', 'POST', v, 'Tasación registrada')
          }
        />
      )}

      {modal === 'improvement' && (
        <FormModal
          title="Registrar mejora de capital"
          hint="Sustituir un componente mayor — un motor, no un cambio de aceite — no es gasto del ejercicio: se capitaliza y alarga la vida útil (IRS §1.263(a)-3)."
          fields={[
            { name: 'label', label: 'Descripción', placeholder: 'Motor 5.3L de reemplazo', required: true },
            { name: 'cost', label: 'Coste total ($)', type: 'number', required: true },
            { name: 'addsLifetimeMiles', label: 'Millas de vida útil que añade', type: 'number',
              hint: 'Es el parámetro que más mueve el valor en libros; conviene validarlo con tu contador. Déjalo en 0 para registrar el coste sin tocar la vida útil.' },
            { name: 'mileageAtImprovement', label: 'Odómetro el día de la mejora', type: 'number',
              hint: 'Sin este dato hay que asumir el actual, y entonces la mejora se desplaza cada vez que actualizas el odómetro y nunca llega a depreciar.' },
            { name: 'componentMiles', label: 'Millas que traía la pieza', type: 'number',
              hint: 'Un motor de reemplazo con 15.000 millas no es un motor nuevo. Déjalo vacío si la pieza era nueva.' },
            { name: 'date', label: 'Fecha', type: 'date' },
            { name: 'notes', label: 'Notas', type: 'textarea' },
          ]}
          onCancel={() => setModal(null)}
          onSubmit={(v) =>
            submit('/api/accounting/vehicle-economics/improvements', 'POST', v, 'Mejora registrada')
          }
        />
      )}

      {modal === 'loan' && (
        <FormModal
          title="Financiación del vehículo"
          hint="Permite calcular el coste real — enganche más intereses más mejoras — y avisar si debes más de lo que el vehículo vale."
          fields={[
            { name: 'lender', label: 'Financiera', placeholder: 'GM Financial' },
            { name: 'amountFinanced', label: 'Importe financiado ($)', type: 'number', required: true },
            { name: 'downPayment', label: 'Enganche ($)', type: 'number' },
            { name: 'apr', label: 'APR (%)', type: 'number', required: true, placeholder: '8.90' },
            { name: 'termMonths', label: 'Plazo (meses)', type: 'number', required: true },
            { name: 'contractPayment', label: 'Cuota real del contrato ($)', type: 'number',
              hint: 'La que cobra el banco de verdad. Manda sobre la que sale de la fórmula: si no coinciden hay un cargo que no está en el APR.' },
            { name: 'currentBalance', label: 'Saldo de capital ($)', type: 'number',
              hint: 'El principal que queda según el estado de cuenta, sin intereses devengados.' },
            { name: 'payoffAmount', label: 'Cancelación hoy ($)', type: 'number',
              hint: 'Lo que pide el banco para liberar el título. Siempre es mayor que el saldo: incluye los intereses corridos desde el último pago.' },
            { name: 'payoffDate', label: 'Fecha de esa cancelación', type: 'date' },
            { name: 'paymentsRemaining', label: 'Pagos restantes', type: 'number' },
            { name: 'interestPaidLast12', label: 'Interés pagado últimos 12 meses ($)', type: 'number',
              hint: 'Comparado con el cuadro teórico delata los pagos tardíos: estos contratos llevan interés simple diario' },
            { name: 'maturityDate', label: 'Fecha de vencimiento', type: 'date' },
          ]}
          onCancel={() => setModal(null)}
          onSubmit={(v) =>
            submit('/api/accounting/vehicle-economics/loan', 'PUT', v, 'Financiación guardada')
          }
        />
      )}

      {modal === 'mileage' && (
        <FormModal
          title="Actualizar millaje"
          hint="La depreciación va por millas recorridas, así que el odómetro al día es lo que mantiene fiel el valor en libros."
          fields={[{ name: 'currentMileage', label: 'Millas actuales', type: 'number', required: true }]}
          onCancel={() => setModal(null)}
          onSubmit={(v) =>
            submit(`/api/accounting/assets/${activeId}`, 'PUT', v, 'Millaje actualizado')
          }
        />
      )}
    </CompanyTabsLayout>
  )
}

/* ------------------------------------------------------------------ modal */

interface Field {
  name: string
  label: string
  type?: 'text' | 'number' | 'date' | 'textarea'
  placeholder?: string
  required?: boolean
  hint?: string
}

function FormModal({
  title, hint, fields, onCancel, onSubmit,
}: {
  title: string
  hint: string
  fields: Field[]
  onCancel: () => void
  onSubmit: (values: Record<string, string | number>) => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Los inputs siempre devuelven string. Los campos numericos se convierten
  // aqui porque no todas las rutas destino hacen la conversion, y mandar "138650"
  // a un campo Int de Prisma es un error en tiempo de ejecucion.
  const coerce = (): Record<string, string | number> => {
    const out: Record<string, string | number> = {}
    for (const f of fields) {
      const raw = values[f.name]
      if (raw == null || raw.trim() === '') continue
      out[f.name] = f.type === 'number' ? Number(raw) : raw
    }
    return out
  }

  const faltan = fields.filter((f) => f.required && !values[f.name]?.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-[#0D2942]">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{hint}</p>

        <div className="mt-5 space-y-4">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-700">
                {f.label}
                {f.required && <span className="ml-0.5 text-red-500">*</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  rows={2}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2CA01C] focus:outline-none focus:ring-1 focus:ring-[#2CA01C]"
                />
              ) : (
                <input
                  type={f.type ?? 'text'}
                  step={f.type === 'number' ? 'any' : undefined}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2CA01C] focus:outline-none focus:ring-1 focus:ring-[#2CA01C]"
                />
              )}
              {f.hint && <p className="mt-1 text-xs text-gray-500">{f.hint}</p>}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            disabled={faltan.length > 0 || saving}
            onClick={async () => {
              setSaving(true)
              await onSubmit(coerce())
              setSaving(false)
            }}
            className="rounded-lg bg-[#2CA01C] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#108000] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
