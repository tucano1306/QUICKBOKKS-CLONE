/**
 * copy-tesseract-worker.mjs
 * Copia el worker y el core WASM de Tesseract.js a /public para servirlos desde
 * el mismo origen: en movil, un importScripts cruzado hacia un CDN falla y el
 * escaner de tickets se queda colgado sin decir por que.
 * Se ejecuta solo antes de `next build` mediante el script `prebuild`.
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// -- Worker bundle ----------------------------------------------------------
const workerSrc = join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js')
if (!existsSync(workerSrc)) {
  console.error('[copy-tesseract] ERROR: no se encontro', workerSrc)
  process.exit(1)
}
mkdirSync(join(root, 'public'), { recursive: true })
copyFileSync(workerSrc, join(root, 'public', 'tesseract-worker.min.js'))
console.log('[copy-tesseract] worker.min.js -> public/tesseract-worker.min.js')

// -- Core WASM (solo variantes LSTM, que es el OEM=1 que usamos) ------------
const corePackage = join(root, 'node_modules', 'tesseract.js-core')
if (!existsSync(corePackage)) {
  console.error('[copy-tesseract] ERROR: no se encontro tesseract.js-core en', corePackage)
  process.exit(1)
}

const coreDest = join(root, 'public', 'tesseract-core')
mkdirSync(coreDest, { recursive: true })

for (const file of [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
]) {
  copyFileSync(join(corePackage, file), join(coreDest, file))
  console.log('[copy-tesseract] ' + file + ' -> public/tesseract-core/' + file)
}
