'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDownLeft, CheckCircle2, Link2, RefreshCw, ShieldCheck, Tags, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Reciente {
  id: string
  description: string
  category: string
  amount: number
  date: string
  updatedAt: string
}

interface EstadoFoody {
  configurada: boolean
  acceso?: boolean
  empresa?: { id: string; nombre: string } | null
  delMes?: { cantidad: number; total: number }
  total?: number
  ultimo?: string | null
  recientes?: Reciente[]
}

const dinero = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

/** «hace 3 min», «hace 2 h», «el 6 oct»: cuando llego el ultimo gasto. */
function haceCuanto(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  if (min < 60 * 24) return `hace ${Math.round(min / 60)} h`
  return `el ${new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(iso))}`
}

/** La fecha de un gasto: el dia que guarda Computo, sin moverlo por la zona. */
const diaDeGasto = (iso: string) =>
  new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(iso))

/**
 * La conexion con Foody, vista desde Computo.
 *
 * Responde a las tres preguntas de quien llega aqui: ¿esta funcionando?,
 * ¿donde caen los gastos? y ¿que ha entrado ultimamente? Los gastos de Foody
 * llevan la referencia `foody:…`, y de ahi salen las cifras.
 */
export default function FoodyIntegrationCard() {
  const [estado, setEstado] = useState<EstadoFoody | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/integrations/foody/estado', { cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudo leer el estado')
      setEstado(await res.json())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const conectada = estado?.configurada && estado.acceso !== false

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-2xl leading-none" aria-hidden="true">
              🥑
            </div>
            <div>
              <CardTitle className="text-xl">Foody</CardTitle>
              <CardDescription>Los gastos que registras en Foody entran solos aquí</CardDescription>
            </div>
          </div>
          {!cargando && estado && (
            <Badge
              variant={conectada ? 'default' : 'secondary'}
              className={conectada ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : ''}
            >
              {conectada ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Conectado
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  {estado.configurada ? 'Sin acceso' : 'Sin configurar'}
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!cargando && estado && !estado.configurada && (
          <div className="bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 p-4 rounded-lg text-sm space-y-2">
            <p className="font-medium text-yellow-800 dark:text-yellow-200">Falta configurar la conexión</p>
            <p className="text-yellow-700 dark:text-yellow-300">
              En Vercel, añade a este proyecto <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">FOODY_SECRET</code> (el
              mismo valor que <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">COMPUTO_SECRET</code> en Foody) y{' '}
              <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">FOODY_COMPANY_ID</code> con el id de la empresa donde
              deben entrar los gastos.
            </p>
          </div>
        )}

        {!cargando && estado?.configurada && estado.acceso === false && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Los gastos de Foody entran en otra empresa, a la que esta cuenta no tiene acceso.
          </p>
        )}

        {conectada && estado && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Entran en</p>
                <p className="font-semibold text-gray-900 dark:text-white">{estado.empresa?.nombre ?? '—'}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Este mes</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {estado.delMes?.cantidad ?? 0} gastos · {dinero(estado.delMes?.total ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-gray-500">Último recibido</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {estado.ultimo ? haceCuanto(estado.ultimo) : 'Todavía ninguno'}
                </p>
              </div>
            </div>

            {estado.recientes && estado.recientes.length > 0 && (
              <ul className="divide-y rounded-lg border" aria-label="Últimos gastos de Foody">
                {estado.recientes.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      <span className="truncate font-medium">{r.description}</span>
                      <Badge variant="outline" className="shrink-0 text-xs py-0 h-5">
                        {r.category}
                      </Badge>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="font-semibold">{dinero(r.amount)}</span>
                      <span className="ml-2 text-xs text-gray-500">{diaDeGasto(r.date)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <ul className="grid gap-2 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-3">
          <li className="flex gap-2">
            <Tags className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" aria-hidden="true" />
            <span>Cada tipo de Foody cae en su categoría: Súper en Supermercado, Gasolina en Gasolina…</span>
          </li>
          <li className="flex gap-2">
            <Link2 className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" aria-hidden="true" />
            <span>Si ya lo habías tecleado aquí, lo enlaza en vez de duplicarlo.</span>
          </li>
          <li className="flex gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" aria-hidden="true" />
            <span>Si cambias la categoría aquí, Foody no te la deshace.</span>
          </li>
        </ul>

        <Button variant="outline" onClick={cargar} disabled={cargando}>
          <RefreshCw className={`h-4 w-4 mr-2 ${cargando ? 'animate-spin' : ''}`} />
          {cargando ? 'Comprobando…' : 'Actualizar'}
        </Button>
      </CardContent>
    </Card>
  )
}
