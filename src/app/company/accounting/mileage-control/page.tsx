'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, Gauge } from 'lucide-react'
import { useCompany } from '@/contexts/CompanyContext'
import CompanyTabsLayout from '@/components/layout/company-tabs-layout'
import { MileageControlCard, type MaintenanceData } from '@/components/vehicles/mileage-control-card'
import { FormModal, type Field } from '@/components/vehicles/form-modal'

/**
 * Control de millas.
 *
 * Responde a una sola pregunta -- cuanto falta para el proximo cambio de
 * aceite -- y lleva el historial para poder comprobar si el estandar se esta
 * cumpliendo de verdad.
 *
 * Toda la aritmetica llega resuelta de /api/accounting/vehicle-maintenance: la
 * pantalla no calcula millas.
 */

type Modal = 'service' | 'interval' | 'mileage' | null

interface OtherCompany {
  id: string
  name: string
  vehicleCount: number
}

export default function MileageControlPage() {
  const { status } = useSession()
  const router = useRouter()
  const { activeCompany, companies, setActiveCompany } = useCompany()

  const [vehicles, setVehicles] = useState<MaintenanceData[]>([])
  const [elsewhere, setElsewhere] = useState<OtherCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchData = useCallback(async () => {
    if (!activeCompany) return
    try {
      setLoading(true)
      const res = await fetch(`/api/accounting/vehicle-maintenance?companyId=${activeCompany.id}`)
      if (res.ok) {
        const data = await res.json()
        setVehicles(data.vehicles || [])
        setElsewhere(data.otherCompanies || [])
      } else {
        const err = await res.json().catch(() => null)
        setMessage({ type: 'error', text: err?.error || 'No se pudo cargar el control de millas' })
      }
    } catch {
      setMessage({ type: 'error', text: 'No se pudo cargar el control de millas' })
    } finally {
      setLoading(false)
    }
  }, [activeCompany])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') fetchData()
  }, [status, fetchData])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 5000)
    return () => clearTimeout(t)
  }, [message])

  const submit = async (
    url: string,
    method: 'POST' | 'PUT' | 'DELETE',
    body: Record<string, unknown> | null,
    ok: string
  ) => {
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        setMessage({ type: 'error', text: err?.error || 'No se pudo guardar' })
        return
      }
      setMessage({ type: 'success', text: ok })
      setModal(null)
      await fetchData()
    } catch {
      setMessage({ type: 'error', text: 'No se pudo conectar con el servidor' })
    }
  }

  const active = vehicles.find((v) => v.asset.id === activeId) ?? vehicles[0]

  const open = (m: Modal, assetId: string) => {
    setActiveId(assetId)
    setModal(m)
  }

  const borrar = (id: string) => {
    if (!window.confirm('¿Borrar este cambio de aceite del historial?')) return
    submit(`/api/accounting/vehicle-maintenance/records?id=${id}`, 'DELETE', null, 'Registro borrado')
  }

  return (
    <CompanyTabsLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <header className="flex items-start gap-3">
          <span className="rounded-xl bg-green-100 p-2.5">
            <Gauge className="h-6 w-6 text-[#2CA01C]" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#0D2942] sm:text-3xl">Control de millas</h1>
            <p className="text-sm text-gray-600">
              Cambios de aceite y mantenimiento por millas recorridas
            </p>
          </div>
        </header>

        {message && (
          <div
            className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
              message.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <p className="text-gray-500">Cargando…</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center sm:p-12">
            <Gauge className="mx-auto h-10 w-10 text-gray-400" />
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
                  para verlos.
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
              <MileageControlCard
                data={v}
                onAddService={() => open('service', v.asset.id)}
                onEditInterval={() => open('interval', v.asset.id)}
                onUpdateMileage={() => open('mileage', v.asset.id)}
                onDeleteRecord={borrar}
              />
            </div>
          ))
        )}

        {modal === 'service' && active && (
          <FormModal
            title="Registrar cambio de aceite"
            hint="Apunta la lectura del odómetro, no las millas del motor: esas se calculan solas."
            submitLabel="Registrar"
            fields={serviceFields(active)}
            onCancel={() => setModal(null)}
            onSubmit={(v) =>
              submit(
                '/api/accounting/vehicle-maintenance/records',
                'POST',
                { assetId: active.asset.id, ...v },
                'Cambio registrado'
              )
            }
          />
        )}

        {modal === 'interval' && active && (
          <FormModal
            title="Intervalo entre cambios"
            hint="Cada cuántas millas toca el cambio de aceite en este vehículo."
            fields={[
              {
                name: 'serviceIntervalMiles',
                label: 'Millas entre cambios',
                type: 'number',
                required: true,
                defaultValue: active.status.intervalMiles,
                hint: 'El estándar de esta camioneta es 5.000. Los avisos se calculan sobre este número, así que cambiarlo mueve todo el control.',
              },
            ]}
            onCancel={() => setModal(null)}
            onSubmit={(v) =>
              submit(
                '/api/accounting/vehicle-maintenance/records',
                'PUT',
                { assetId: active.asset.id, ...v },
                'Intervalo actualizado'
              )
            }
          />
        )}

        {modal === 'mileage' && active && (
          <FormModal
            title="Actualizar millaje"
            hint="La lectura actual del odómetro. De aquí sale todo el control."
            fields={[
              {
                name: 'currentMileage',
                label: 'Odómetro',
                type: 'number',
                required: true,
                defaultValue: active.asset.currentMileage,
              },
            ]}
            onCancel={() => setModal(null)}
            onSubmit={(v) =>
              submit(
                `/api/accounting/assets/${active.asset.id}`,
                'PUT',
                { ...v, lastMileageUpdate: new Date().toISOString() },
                'Millaje actualizado'
              )
            }
          />
        )}
      </div>
    </CompanyTabsLayout>
  )
}

/** Campos del cambio de aceite, con el odómetro previsto ya sugerido. */
function serviceFields(v: MaintenanceData): Field[] {
  return [
    {
      name: 'odometer',
      label: 'Lectura del odómetro',
      type: 'number',
      required: true,
      defaultValue: Math.max(v.asset.currentMileage, v.status.nextDueOdometer),
      hint: `El cambio tocaba con el odómetro en ${v.status.nextDueOdometer.toLocaleString('es')}. Corrige con lo que marque de verdad.`,
    },
    { name: 'date', label: 'Fecha', type: 'date' },
    { name: 'cost', label: 'Coste ($)', type: 'number' },
    { name: 'vendor', label: 'Taller', type: 'text', placeholder: 'Jiffy Lube' },
    {
      name: 'oilType',
      label: 'Tipo de aceite',
      type: 'text',
      placeholder: '5W-30 sintético',
      hint: 'Anotarlo evita cambiar de criterio sin darse cuenta entre un taller y otro.',
    },
    {
      name: 'photoUrl',
      label: 'Foto del odómetro (enlace)',
      type: 'text',
      hint: 'Opcional. Respaldo de la lectura por si hay que revisarla más adelante.',
    },
    { name: 'notes', label: 'Notas', type: 'textarea' },
  ]
}
