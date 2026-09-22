'use client'

import { useState } from 'react'

/**
 * Formulario modal generico de la seccion de vehiculos.
 *
 * Lo usan la pantalla de economia y la de control de millas. Vive aparte para
 * no tener dos copias que se separen con el tiempo, que es exactamente el
 * problema que hubo con la navegacion duplicada.
 */

export interface Field {
  name: string
  label: string
  type?: 'text' | 'number' | 'date' | 'textarea'
  placeholder?: string
  required?: boolean
  hint?: string
  /** Valor con el que aparece el campo relleno al abrirse. */
  defaultValue?: string | number
}

export function FormModal({
  title,
  hint,
  fields,
  submitLabel = 'Guardar',
  onCancel,
  onSubmit,
}: Readonly<{
  title: string
  hint: string
  fields: Field[]
  submitLabel?: string
  onCancel: () => void
  onSubmit: (values: Record<string, string | number>) => void | Promise<void>
}>) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of fields) {
      if (f.defaultValue != null) init[f.name] = String(f.defaultValue)
    }
    return init
  })
  const [saving, setSaving] = useState(false)

  // Los inputs siempre devuelven string. Los campos numericos se convierten
  // aqui porque no todas las rutas destino hacen la conversion, y mandar
  // "138650" a un campo Int de Prisma es un error en tiempo de ejecucion.
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
              <label className="block text-sm font-medium text-gray-700" htmlFor={`fm-${f.name}`}>
                {f.label}
                {f.required && <span className="ml-0.5 text-red-500">*</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  id={`fm-${f.name}`}
                  rows={2}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2CA01C] focus:outline-none focus:ring-1 focus:ring-[#2CA01C]"
                />
              ) : (
                <input
                  id={`fm-${f.name}`}
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
            type="button"
            onClick={onCancel}
            className="rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={faltan.length > 0 || saving}
            onClick={async () => {
              setSaving(true)
              await onSubmit(coerce())
              setSaving(false)
            }}
            className="rounded-lg bg-[#2CA01C] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#108000] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Guardando…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
