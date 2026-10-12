import crypto from 'crypto'

/**
 * La firma con la que Foody demuestra que un lote de gastos viene de el.
 *
 * Mismo esquema que los webhooks de Stripe: `t=<segundos>,v1=<hex>`, donde v1
 * es HMAC-SHA256 del texto `${t}.${cuerpo}` con un secreto que solo conocen
 * las dos apps (FOODY_SECRET aqui, COMPUTO_SECRET en Foody).
 *
 * - El cuerpo firmado es el texto EXACTO que llego, antes de parsear: firmar
 *   el JSON re-serializado fallaria con cualquier diferencia de espacios.
 * - El sello de tiempo entra en la firma y caduca a los 5 minutos: un lote
 *   capturado no se puede reenviar mas tarde.
 * - La comparacion es de tiempo constante.
 *
 * El mismo modulo vive en Foody (`lib/computo/firma.ts`); las pruebas de los
 * dos lados usan el mismo vector, que es el contrato entre ambos.
 */

export const TOLERANCIA_FIRMA_SEGUNDOS = 300

export function firmarCuerpo(secreto: string, timestamp: number, cuerpo: string): string {
  return crypto.createHmac('sha256', secreto).update(`${timestamp}.${cuerpo}`).digest('hex')
}

export function cabeceraFirma(secreto: string, cuerpo: string, ahoraMs: number = Date.now()): string {
  const t = Math.floor(ahoraMs / 1000)
  return `t=${t},v1=${firmarCuerpo(secreto, t, cuerpo)}`
}

/**
 * Una sola forma y no una union: este proyecto compila con `strict: false`, y
 * ahi `if (!r.ok)` no estrecha el tipo para poder leer `motivo`.
 */
export interface ResultadoFirma {
  ok: boolean
  motivo?: string
}

export function verificarFirma(
  secreto: string,
  cabecera: string | null | undefined,
  cuerpo: string,
  ahoraMs: number = Date.now()
): ResultadoFirma {
  if (!secreto) return { ok: false, motivo: 'Integracion sin secreto configurado' }
  if (!cabecera) return { ok: false, motivo: 'Falta la firma' }

  const partes = new Map(
    cabecera.split(',').map((p) => {
      const i = p.indexOf('=')
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()] as const
    })
  )
  const t = Number(partes.get('t'))
  const v1 = partes.get('v1') ?? ''
  if (!Number.isInteger(t) || !/^[0-9a-f]{64}$/.test(v1)) return { ok: false, motivo: 'Firma mal formada' }

  if (Math.abs(Math.floor(ahoraMs / 1000) - t) > TOLERANCIA_FIRMA_SEGUNDOS) {
    return { ok: false, motivo: 'Firma caducada' }
  }

  const esperada = Buffer.from(firmarCuerpo(secreto, t, cuerpo), 'hex')
  const recibida = Buffer.from(v1, 'hex')
  if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) {
    return { ok: false, motivo: 'Firma invalida' }
  }
  return { ok: true }
}
