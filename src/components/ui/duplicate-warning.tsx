'use client'

import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export interface DuplicateRecord {
  id: string
  label: string
  amount: number
  date: string
  vendor?: string
  reference?: string
  category?: string
  status?: string
  paymentMethod?: string
  url: string
}

interface DuplicateWarningProps {
  readonly duplicates: DuplicateRecord[]
  readonly type: 'expense' | 'payment'
}

function buildTitle(type: 'expense' | 'payment', count: number): string {
  const plural = count > 1
  const noun = type === 'expense' ? 'gasto' : 'pago'
  const nounPlural = plural ? `${noun}s` : noun
  const verb = plural ? 'encontraron' : 'encontró'
  const adj = plural ? 'similares' : 'similar'
  const past = plural ? 'registrados' : 'registrado'
  return `⚠️ Se ${verb} ${count} ${nounPlural} ${adj} ya ${past}`
}

export default function DuplicateWarning({ duplicates, type }: DuplicateWarningProps) {
  const [expanded, setExpanded] = useState(false)

  if (duplicates.length === 0) return null

  const title = buildTitle(type, duplicates.length)

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const formatDate = (d: string) => {
    const [year, month, day] = d.split('-')
    return `${month}/${day}/${year}`
  }

  return (
    <div className="border border-yellow-400 bg-yellow-50 rounded-lg p-3 mb-4">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2 text-yellow-800 font-medium text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
          <span>{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-yellow-600 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-yellow-600 shrink-0" />
        )}
      </button>

      <p className="text-xs text-yellow-700 mt-1 ml-6">
        Revisa si ya fue ingresado antes de guardar. Puedes continuar si es un registro diferente.
      </p>

      {expanded && (
        <div className="mt-3 space-y-2">
          {duplicates.map(dup => (
            <div
              key={dup.id}
              className="flex items-start justify-between bg-white border border-yellow-200 rounded-md px-3 py-2 text-sm"
            >
              <div className="space-y-0.5">
                <p className="font-medium text-gray-800 truncate max-w-[260px]">{dup.label}</p>
                <p className="text-gray-500">
                  {formatCurrency(dup.amount)} &middot; {formatDate(dup.date)}
                  {dup.vendor ? ` · ${dup.vendor}` : ''}
                  {dup.reference ? ` · Ref: ${dup.reference}` : ''}
                  {dup.category ? ` · ${dup.category}` : ''}
                </p>
                {dup.status && (
                  <span className="inline-block text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {dup.status}
                  </span>
                )}
              </div>
              <Link
                href={dup.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3 shrink-0 text-yellow-700 hover:text-yellow-900 flex items-center gap-1 text-xs underline underline-offset-2"
              >
                Ver <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
