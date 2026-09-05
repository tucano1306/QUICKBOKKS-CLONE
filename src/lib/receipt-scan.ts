/**
 * Lógica pura de extracción de datos de tickets/recibos escaneados por OCR.
 *
 * La parte difícil de "leer un ticket" no es reconocer caracteres — es decidir
 * CUÁL de los diez números impresos es el total. Un recibo muestra subtotal,
 * impuesto, propina, efectivo entregado, cambio y el precio de cada artículo.
 * Tomar el primero, o el más grande, se equivoca casi siempre.
 *
 * La señal fiable es la PALABRA que acompaña al número: el importe que va en la
 * misma línea que "TOTAL" es el total; el que va junto a "CAMBIO" jamás lo es.
 * Por eso aquí se puntúa cada importe por la etiqueta de su línea y sólo se
 * recurre a números sueltos cuando no hay ninguna etiqueta que seguir.
 *
 * Todo es determinista y sin dependencias de framework para poder testearlo.
 */

export type ScanQuality = 'strong' | 'weak' | 'none'

// ─── Preprocesado de imagen (opera sobre búferes de píxeles) ─────────────────

/** Método de Otsu — umbral B/N óptimo a partir de un histograma de 256 niveles. */
export function otsuThreshold(hist: readonly number[], total: number): number {
  let sumAll = 0
  for (let i = 0; i < 256; i++) sumAll += i * hist[i]
  let sumB = 0
  let weightB = 0
  let maxVariance = 0
  let threshold = 127
  for (let t = 0; t < 256; t++) {
    weightB += hist[t]
    if (weightB === 0) continue
    const weightF = total - weightB
    if (weightF === 0) break
    sumB += t * hist[t]
    const meanB = sumB / weightB
    const meanF = (sumAll - sumB) / weightF
    const variance = weightB * weightF * (meanB - meanF) ** 2
    if (variance > maxVariance) {
      maxVariance = variance
      threshold = t
    }
  }
  return threshold
}

/** Escala de grises + binarización de Otsu in situ — texto negro sobre blanco. */
export function binarize(imageData: ImageData): void {
  const d = imageData.data
  const grey = new Uint8Array(d.length / 4)
  const hist = new Array<number>(256).fill(0)
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
    grey[p] = g
    hist[g]++
  }
  const threshold = otsuThreshold(hist, grey.length)
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const v = grey[p] >= threshold ? 255 : 0
    d[i] = v; d[i + 1] = v; d[i + 2] = v
  }
}

/**
 * Lado mayor objetivo. Un ticket lleva muchas líneas de texto pequeño, así que
 * necesita más resolución que una etiqueta de precio: se amplían las fotos
 * pequeñas y sólo se recortan las muy grandes (memoria del WASM en móvil).
 */
export function ocrScale(longest: number): number {
  const MAX_PX = 2200
  const MIN_PX = 1500
  if (longest > MAX_PX) return MAX_PX / longest
  if (longest < MIN_PX) return MIN_PX / longest
  return 1
}

// ─── Lectura de importes ─────────────────────────────────────────────────────

const MAX_AMOUNT = 9_999_999

/**
 * Convierte un importe impreso en número, decidiendo qué significa cada
 * separador: si aparecen los dos, el ÚLTIMO es el decimal ("1.234,56" y
 * "1,234.56" son ambos 1234.56); si sólo hay uno, tres cifras detrás lo hacen
 * de millares y cualquier otra cantidad, decimal.
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, '')
  if (!cleaned || !/\d/.test(cleaned)) return null

  const lastDot = cleaned.lastIndexOf('.')
  const lastComma = cleaned.lastIndexOf(',')
  let normalized: string

  if (lastDot >= 0 && lastComma >= 0) {
    const decimalAt = Math.max(lastDot, lastComma)
    const intPart = cleaned.slice(0, decimalAt).replace(/[.,]/g, '')
    normalized = intPart + '.' + cleaned.slice(decimalAt + 1)
  } else if (lastDot >= 0 || lastComma >= 0) {
    const at = Math.max(lastDot, lastComma)
    const decimals = cleaned.length - at - 1
    const occurrences = cleaned.split(cleaned[at]).length - 1
    normalized = (occurrences > 1 || decimals === 3)
      ? cleaned.replace(/[.,]/g, '')
      : cleaned.slice(0, at).replace(/[.,]/g, '') + '.' + cleaned.slice(at + 1)
  } else {
    normalized = cleaned
  }

  const value = Number.parseFloat(normalized)
  if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) return null
  return Math.round(value * 100) / 100
}

// Formatos de importe, del más específico al más suelto:
//  "1,234.56" / "1.234,56" → miles + decimales
//  "12.99" / "12,99"       → decimales sueltos
//  "$25"                   → entero con símbolo de moneda (sin él es ambiguo)
const MONEY_RE = /\$?\s?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\$?\s?\d+[.,]\d{2}|\$\s?\d+/g

/** Todos los importes de una línea, en orden de aparición. */
export function amountsInLine(line: string): number[] {
  const out: number[] = []
  for (const match of line.matchAll(MONEY_RE)) {
    const value = parseAmount(match[0])
    if (value !== null) out.push(value)
  }
  return out
}

// ─── Clasificación de líneas ─────────────────────────────────────────────────

// "TOTAL" a secas es ambiguo: aparece en "SUBTOTAL", en "TOTAL TAX" y en
// "TOTAL ITEMS". Estas listas separan la línea que trae el importe a cobrar de
// las que sólo lo parecen.
const DEFINITIVE_TOTAL = /\b(?:TOTAL\s+A\s+PAGAR|IMPORTE\s+TOTAL|GRAN\s+TOTAL|GRAND\s+TOTAL|TOTAL\s+DUE|AMOUNT\s+DUE|BALANCE\s+DUE|TOTAL\s+VENTA|NET\s+TOTAL)\b/
const PLAIN_TOTAL = /\b(?:TOTAL|IMPORTE|MONTO)\b/
const SUBTOTAL = /\bSUB\s?-?\s?TOTAL\b/
// "TOTAL" seguido de algo que no es dinero a cobrar.
const TOTAL_NOT_MONEY = /\bTOTAL\s+(?:TAX|IMPUESTOS?|SAVINGS|AHORROS?|ITEMS?|ART[IÍ]CULOS?|UNIDADES|QTY|DISCOUNT|DESCUENTOS?|PIEZAS)\b/
const CHANGE = /\b(?:CHANGE|CAMBIO|VUELTO|CASH\s+BACK)\b/
const TENDERED = /\b(?:CASH|EFECTIVO|TENDER(?:ED)?|VISA|MASTERCARD|AMEX|DISCOVER|DEBIT|CREDIT|D[EÉ]BITO|CR[EÉ]DITO|TARJETA|PAYMENT|PAGO)\b/
const TAX_LINE = /\b(?:SALES\s+TAX|TAX|IVA|IGV|ITBIS|IMPUESTOS?)\b/

/** Un importe candidato a total, con la puntuación que le da su etiqueta. */
export interface TotalCandidate {
  value: number
  /** Etiqueta que lo ancla, para mostrarla en la confirmación. */
  label: string
  score: number
}

const SCORE = {
  definitive: 100,
  total: 80,
  subtotal: 35,
  tendered: 25,
  bare: 15,
  change: 5,
} as const

function classifyLine(upper: string): { score: number; label: string } | null {
  if (CHANGE.test(upper)) return { score: SCORE.change, label: 'Cambio' }
  if (DEFINITIVE_TOTAL.test(upper)) return { score: SCORE.definitive, label: 'Total' }
  if (SUBTOTAL.test(upper)) return { score: SCORE.subtotal, label: 'Subtotal' }
  if (TOTAL_NOT_MONEY.test(upper)) return null
  if (PLAIN_TOTAL.test(upper)) return { score: SCORE.total, label: 'Total' }
  if (TAX_LINE.test(upper)) return null
  if (TENDERED.test(upper)) return { score: SCORE.tendered, label: 'Pago' }
  return { score: SCORE.bare, label: 'Importe' }
}

/**
 * Puntúa todos los importes del ticket.
 *
 * De cada línea se toma el ÚLTIMO importe: los recibos imprimen la etiqueta a
 * la izquierda y el dinero a la derecha, y en medio suelen colarse cantidades y
 * precios unitarios ("2 x 3.50   7.00").
 */
export function buildTotalCandidates(text: string): TotalCandidate[] {
  const best = new Map<number, TotalCandidate>()

  for (const line of text.split('\n')) {
    const upper = line.toUpperCase()
    const amounts = amountsInLine(line)
    if (amounts.length === 0) continue
    const classification = classifyLine(upper)
    if (!classification) continue

    const value = amounts[amounts.length - 1]
    const candidate: TotalCandidate = { value, ...classification }
    const previous = best.get(value)
    if (!previous || candidate.score > previous.score) best.set(value, candidate)
  }

  // Importes mayores primero cuando dos líneas empatan en etiqueta: en un
  // recibo el total supera a cualquiera de sus partes.
  return [...best.values()].sort((a, b) => b.score - a.score || b.value - a.value)
}

// ─── Fecha ───────────────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 1, ene: 1, feb: 2, mar: 3, apr: 4, abr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, ago: 8, sep: 9, oct: 10, nov: 11, dec: 12, dic: 12,
}

function isoDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const year = y < 100 ? 2000 + y : y
  if (year < 2000 || year > 2100) return null
  const date = new Date(Date.UTC(year, m - 1, d))
  // Rechaza días que no existen (31 de febrero): el Date los desplaza de mes.
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return year + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0')
}

/**
 * Primera fecha reconocible del ticket, normalizada a `YYYY-MM-DD`.
 *
 * En "03/04/2025" no hay forma de saber si es marzo o abril, así que se asume
 * el orden estadounidense mes/día que usan los recibos del país — salvo cuando
 * la primera cifra pasa de 12 y sólo puede ser un día.
 */
export function extractDate(text: string): string | null {
  const iso = /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/.exec(text)
  if (iso) {
    const parsed = isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))
    if (parsed) return parsed
  }

  const named = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/.exec(text)
  if (named) {
    const month = MONTHS[named[1].slice(0, 3).toLowerCase()]
    if (month) {
      const parsed = isoDate(Number(named[3]), month, Number(named[2]))
      if (parsed) return parsed
    }
  }

  const numeric = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/.exec(text)
  if (numeric) {
    const first = Number(numeric[1])
    const second = Number(numeric[2])
    const year = Number(numeric[3])
    const parsed = first > 12
      ? isoDate(year, second, first)
      : isoDate(year, first, second)
    if (parsed) return parsed
  }

  return null
}

// ─── Comercio ────────────────────────────────────────────────────────────────

// Cabeceras que no son el nombre del negocio aunque salgan arriba del todo.
// "STORE" y "CAJA" sólo descartan la línea cuando llevan número detrás: son el
// código de la sucursal, no el rótulo — pero también forman parte de nombres
// reales como "THE UPS STORE", que sí queremos conservar.
const NOT_MERCHANT = /\b(?:RECIBO|RECEIPT|FACTURA|INVOICE|TICKET|COPIA|CUSTOMER|CLIENTE|WELCOME|BIENVENIDO|GRACIAS|THANK|TEL|PHONE|FAX|RFC|NIT|CIF|TIENDA|SUCURSAL|ORDER|PEDIDO|DATE|FECHA)\b|\b(?:STORE|CAJA)\s*#?\s*\d/

/**
 * Nombre del comercio: la primera línea con aspecto de rótulo dentro de la
 * cabecera. Se limita a las primeras líneas porque más abajo empiezan los
 * artículos, y cualquiera de ellos pasaría los mismos filtros.
 */
export function extractMerchant(text: string): string | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  for (const line of lines.slice(0, 6)) {
    const letters = line.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '')
    if (letters.length < 3) continue
    if (NOT_MERCHANT.test(line.toUpperCase())) continue
    // Una línea con tantos dígitos como letras es una dirección o un teléfono.
    const digits = line.replace(/\D/g, '').length
    if (digits >= letters.length) continue
    return line.replace(/\s+/g, ' ').slice(0, 60)
  }

  return null
}

// ─── Impuesto ────────────────────────────────────────────────────────────────

/** Importe de impuesto del ticket, si viene desglosado. */
export function extractTax(text: string): number | null {
  for (const line of text.split('\n')) {
    const upper = line.toUpperCase()
    if (!TAX_LINE.test(upper)) continue
    if (/\bTAX\s*(?:ID|EXEMPT)\b/.test(upper)) continue
    const amounts = amountsInLine(line)
    if (amounts.length > 0) return amounts[amounts.length - 1]
  }
  return null
}

// ─── Resultado completo ──────────────────────────────────────────────────────

export interface ReceiptData {
  /** Total a cobrar, o `null` si no hay nada suficientemente fiable. */
  total: number | null
  /** Importes alternativos, mejor primero, para que el usuario corrija. */
  candidates: TotalCandidate[]
  date: string | null
  merchant: string | null
  tax: number | null
  quality: ScanQuality
  /** Si el OCR devolvió algo legible — distingue "foto borrosa" de "sin total". */
  hasText: boolean
}

/**
 * Lee un ticket completo a partir del texto del OCR.
 *
 * La calidad marca cuánta confianza puede depositar la interfaz en el total:
 * `strong` cuando una etiqueta lo respalda y se puede rellenar el formulario
 * solo; `weak` cuando sólo hay números sueltos y el usuario debe confirmar.
 */
export function readReceipt(text: string): ReceiptData {
  const candidates = buildTotalCandidates(text)
  const hasText = /[A-Za-z0-9]/.test(text)
  const best = candidates.length > 0 ? candidates[0] : null

  let quality: ScanQuality = 'none'
  if (best) quality = best.score >= SCORE.total ? 'strong' : 'weak'

  return {
    total: best && quality === 'strong' ? best.value : null,
    candidates,
    date: extractDate(text),
    merchant: extractMerchant(text),
    tax: extractTax(text),
    quality,
    hasText,
  }
}
