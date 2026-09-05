'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { binarize, ocrScale, readReceipt, type ReceiptData } from '@/lib/receipt-scan'
import { AlertTriangle, Camera, Check, ImageIcon, Loader2, RotateCcw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
// Sólo el tipo: el motor OCR (≈14 MB de WASM) se carga con un import dinámico
// al escanear, para que no entre en el bundle de la página.
import type { Worker as OcrWorker } from 'tesseract.js'

export interface ReceiptScanResult {
  amount: number
  /** `YYYY-MM-DD`, o `null` si el ticket no traía fecha legible. */
  date: string | null
  merchant: string | null
  tax: number | null
}

interface Props {
  readonly onResult: (result: ReceiptScanResult) => void
  readonly onClose: () => void
}

type ScanState = 'idle' | 'camera' | 'processing' | 'preview' | 'error'

/** Margen blanco alrededor de la foto para que el texto binarizado no toque el borde. */
const OCR_PADDING = 0.03

// Guía de encuadre como fracción del recuadro de la cámara. Un ticket es alto y
// estrecho, así que el margen lateral es mayor que el vertical: recortar a la
// guía quita la mesa y las manos, que sólo añaden ruido al OCR.
const GUIDE_MX = 0.08
const GUIDE_MY = 0.04

/**
 * Recorta la zona encuadrada del vídeo a un Blob, trasladando la guía que se ve
 * en pantalla (mostrada con object-cover) a los píxeles reales del vídeo, para
 * que se lea exactamente lo que el usuario encuadró.
 */
function cropGuideToBlob(video: HTMLVideoElement, cw: number, ch: number): Promise<Blob | null> {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh || !cw || !ch) return Promise.resolve(null)
  const scale = Math.max(cw / vw, ch / vh) // factor de relleno de object-cover
  const offX = (vw * scale - cw) / 2
  const offY = (vh * scale - ch) / 2
  const sx = (GUIDE_MX * cw + offX) / scale
  const sy = (GUIDE_MY * ch + offY) / scale
  const sw = ((1 - 2 * GUIDE_MX) * cw) / scale
  const sh = ((1 - 2 * GUIDE_MY) * ch) / scale
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sw))
  canvas.height = Math.max(1, Math.round(sh))
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95))
}

/** Reescala y binariza la foto antes del OCR: papel térmico gris → negro sobre blanco. */
function prepareForOcr(file: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = ocrScale(Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const pad = Math.round(Math.max(w, h) * OCR_PADDING)
      const canvas = document.createElement('canvas')
      canvas.width = w + pad * 2
      canvas.height = h + pad * 2
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas no disponible')); return }
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, pad, pad, w, h)
      const imageData = ctx.getImageData(pad, pad, w, h)
      binarize(imageData)
      ctx.putImageData(imageData, pad, pad)
      canvas.toBlob(
        (blob) => { blob ? resolve(blob) : reject(new Error('Error al procesar la imagen')) },
        'image/png',
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen inválida')) }
    img.src = url
  })
}

export default function ReceiptScannerModal({ onResult, onClose }: Props) {
  const [state, setState] = useState<ScanState>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [data, setData] = useState<ReceiptData | null>(null)
  const [amount, setAmount] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [phase, setPhase] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  const showPreview = useCallback((url: string) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = url
    setPreview(url)
  }, [])

  const processImage = useCallback(async (file: Blob) => {
    setState('processing')
    setErrorMsg(null)
    setPhase('Preparando imagen…')
    showPreview(URL.createObjectURL(file))

    let worker: OcrWorker | null = null
    try {
      const prepared = await prepareForOcr(file)
      setPhase('Cargando lector OCR…')
      const { createWorker, PSM } = await import('tesseract.js')
      worker = await createWorker('eng', 1, {
        workerPath: '/tesseract-worker.min.js',
        corePath: '/tesseract-core',
        langPath: '/tessdata',
        logger: ({ status }: { status: string }) => {
          if (status === 'recognizing text') setPhase('Leyendo el ticket…')
        },
      })
      // Sin lista blanca de caracteres: a diferencia de una etiqueta de precio,
      // aquí las LETRAS son la señal principal — "TOTAL" es lo que distingue el
      // importe a cobrar del subtotal, del impuesto y del cambio.
      await worker.setParameters({ user_defined_dpi: '300' })

      // Pase 1 — el ticket como un bloque de texto corrido, que es su forma
      // habitual: una sola columna de líneas.
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
      const pass1 = await worker.recognize(prepared, undefined, { text: true })
      let text = pass1.data.text ?? ''
      let parsed = readReceipt(text)

      // Pase 2 — sólo si no apareció un total etiquetado: en tickets torcidos o
      // con logotipo, la segmentación automática separa mejor las columnas.
      if (parsed.quality !== 'strong') {
        await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
        const pass2 = await worker.recognize(prepared, undefined, { text: true })
        text = text + '\n' + (pass2.data.text ?? '')
        parsed = readReceipt(text)
      }

      setData(parsed)
      setAmount(parsed.total !== null ? parsed.total.toFixed(2) : '')
      setState('preview')
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'No se pudo leer el ticket.')
      setState('error')
    } finally {
      await worker?.terminate().catch(() => null)
    }
  }, [showPreview])

  // Selector nativo de archivos — sirve de alternativa cuando la cámara en vivo
  // no está disponible y para elegir una foto ya hecha.
  const openFile = useCallback((useCapture: boolean) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    if (useCapture) input.capture = 'environment'
    input.style.cssText = 'position:fixed;top:-200px;left:-200px;opacity:0;'
    document.body.append(input)
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      input.remove()
      if (file) void processImage(file)
    })
    input.click()
  }, [processImage])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCamera = useCallback(async () => {
    setErrorMsg(null)
    // Sin cámara en vivo se abre el selector nativo AQUÍ, todavía dentro del
    // gesto del usuario, que es lo único que el navegador acepta.
    if (!navigator.mediaDevices?.getUserMedia) { openFile(true); return }
    setState('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      const v = videoRef.current
      if (v) { v.srcObject = stream; await v.play().catch(() => undefined) }
    } catch (error) {
      stopCamera()
      // No se reabre el selector aquí: el `await` de getUserMedia ya consumió
      // el gesto del usuario y el navegador bloquearía el click(), dejando la
      // pantalla muerta. Se explica el motivo y se ofrece un botón que pulsar.
      const name = error instanceof Error ? error.name : ''
      let message = 'No se pudo abrir la cámara.'
      if (name === 'NotAllowedError') {
        message = 'No diste permiso para usar la cámara. Actívalo en el navegador o sube una foto del ticket.'
      } else if (name === 'NotFoundError') {
        message = 'No se encontró ninguna cámara en este dispositivo.'
      }
      setErrorMsg(message)
      setState('error')
    }
  }, [openFile, stopCamera])

  const capturePhoto = useCallback(async () => {
    const v = videoRef.current
    const f = frameRef.current
    if (!v || !f) return
    const rect = f.getBoundingClientRect()
    const blob = await cropGuideToBlob(v, rect.width, rect.height)
    stopCamera()
    if (blob) { void processImage(blob) }
    else { setErrorMsg('No se pudo capturar la imagen.'); setState('error') }
  }, [processImage, stopCamera])

  // Libera la cámara y la URL de la vista previa al cerrar.
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

  const handleClose = () => { stopCamera(); onClose() }

  const parsedAmount = Number.parseFloat(amount.replaceAll(',', '.'))
  const canConfirm = Number.isFinite(parsedAmount) && parsedAmount > 0

  const confirm = () => {
    if (!canConfirm) return
    onResult({
      amount: Math.round(parsedAmount * 100) / 100,
      date: data?.date ?? null,
      merchant: data?.merchant ?? null,
      tax: data?.tax ?? null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Cerrar escáner de tickets"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
        onClick={handleClose}
      />

      <div className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Camera className="h-4 w-4 text-[#0077C5]" />
              Escanear ticket
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Extraemos el total, la fecha y el comercio
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Vista previa de la captura */}
        {preview && (state === 'processing' || state === 'preview') && (
          <div className="relative w-full h-40 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Ticket capturado" className="w-full h-full object-contain" />
          </div>
        )}

        {/* idle */}
        {state === 'idle' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 leading-relaxed">
              Apunta la cámara al ticket completo, con el <strong>total</strong> visible.
              El procesamiento ocurre en tu dispositivo: la foto no sale de aquí.
            </p>
            <Button
              type="button"
              onClick={startCamera}
              className="w-full bg-[#0077C5] hover:bg-[#005fa3]"
            >
              <Camera className="h-4 w-4 mr-2" />
              Abrir cámara
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => openFile(false)}
              className="w-full"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Subir una foto
            </Button>
          </div>
        )}

        {/* cámara en vivo */}
        {state === 'camera' && (
          <div className="space-y-3">
            <div ref={frameRef} className="relative w-full h-80 bg-black rounded-xl overflow-hidden">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div
                className="absolute rounded-lg border-2 border-white/90 pointer-events-none"
                style={{ top: '4%', bottom: '4%', left: '8%', right: '8%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
              />
              <p className="absolute inset-x-0 bottom-3 text-center text-white text-xs font-medium drop-shadow">
                Encuadra el ticket entero dentro del recuadro
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => { stopCamera(); setState('idle') }}>
                Cancelar
              </Button>
              <Button type="button" onClick={capturePhoto} className="flex-1 bg-[#0077C5] hover:bg-[#005fa3]">
                <Camera className="h-4 w-4 mr-2" />
                Capturar ticket
              </Button>
            </div>
          </div>
        )}

        {/* procesando */}
        {state === 'processing' && (
          <div className="text-center py-6 space-y-3">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-[#0077C5]" />
            <p className="text-sm text-gray-500">{phase}</p>
          </div>
        )}

        {/* error */}
        {state === 'error' && (
          <div className="space-y-3">
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{errorMsg ?? 'No se pudo leer el ticket.'}</p>
            </div>
            {/* "Elegir foto" es la salida que sí funciona con la cámara denegada:
                reintentar volvería a chocar con el mismo permiso. */}
            <div className="flex gap-2">
              <Button type="button" onClick={() => openFile(false)} className="flex-1 bg-[#0077C5] hover:bg-[#005fa3]">
                <ImageIcon className="h-4 w-4 mr-2" />
                Elegir foto
              </Button>
              <Button type="button" variant="outline" onClick={startCamera} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </div>
        )}

        {/* resultado */}
        {state === 'preview' && data && (
          <div className="space-y-4">
            {data.quality === 'none' && (
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  {data.hasText
                    ? 'No encontramos ningún importe. Escríbelo abajo o repite la foto enfocando el total.'
                    : 'La foto está borrosa o no muestra texto. Acerca la cámara y vuelve a intentarlo.'}
                </p>
              </div>
            )}

            {data.quality === 'weak' && (
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  No vimos la palabra <strong>Total</strong> en el ticket. Confirma el importe correcto
                  antes de guardarlo.
                </p>
              </div>
            )}

            {/* Importe: siempre editable, aunque el OCR lo haya acertado. */}
            <div>
              <Label htmlFor="scan-amount">Total del ticket *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="scan-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Otros importes leídos, para corregir de un toque. */}
            {data.candidates.length > 1 && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Otros importes detectados:</p>
                <div className="flex flex-wrap gap-2">
                  {data.candidates.slice(0, 6).map((candidate) => {
                    const selected = parsedAmount === candidate.value
                    return (
                      <button
                        key={candidate.value}
                        type="button"
                        onClick={() => setAmount(candidate.value.toFixed(2))}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition ${
                          selected
                            ? 'border-[#0077C5] bg-blue-50 text-[#0077C5]'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-[#0077C5]'
                        }`}
                      >
                        ${candidate.value.toFixed(2)}
                        <span className="ml-1.5 font-normal text-xs text-gray-400">{candidate.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Lo demás que se rellenará en el formulario. */}
            {(data.merchant || data.date || data.tax !== null) && (
              <dl className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 space-y-1 text-sm">
                {data.merchant && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Comercio</dt>
                    <dd className="font-medium text-gray-800 text-right truncate">{data.merchant}</dd>
                  </div>
                )}
                {data.date && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Fecha</dt>
                    <dd className="font-medium text-gray-800">{data.date}</dd>
                  </div>
                )}
                {data.tax !== null && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Impuesto</dt>
                    <dd className="font-medium text-gray-800">${data.tax.toFixed(2)}</dd>
                  </div>
                )}
              </dl>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={startCamera} aria-label="Escanear de nuevo">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={confirm}
                disabled={!canConfirm}
                className="flex-1 bg-[#0077C5] hover:bg-[#005fa3]"
              >
                <Check className="h-4 w-4 mr-2" />
                Usar estos datos
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
