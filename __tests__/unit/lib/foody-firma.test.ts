/**
 * @jest-environment node
 */
import { cabeceraFirma, firmarCuerpo, huellaSecreto, verificarFirma } from '@/lib/foody-integration/firma'

/**
 * La firma con la que Foody demuestra que un lote es suyo.
 *
 * El primer caso es el CONTRATO entre las dos apps: el mismo vector esta en
 * las pruebas de Foody (`lib/computo/firma.test.ts`). Si alguien cambia el
 * algoritmo en un lado y no en el otro, falla aqui o alli.
 */
const SECRETO = 'secreto-de-prueba-foody-computo-0123456789'
const T = 1_760_000_000
const CUERPO = '{"ping":true}'

describe('firma Foody → Computo', () => {
  it('el vector compartido con Foody', () => {
    expect(firmarCuerpo(SECRETO, T, CUERPO)).toBe('7215974da98b111d77836844a943ce044c3a73f4e85ce1b01c88796d56529795')
  })

  it('la huella del secreto, tambien compartida con Foody', () => {
    expect(huellaSecreto(SECRETO)).toBe('659be3')
    expect(huellaSecreto(SECRETO + 'x')).not.toBe('659be3')
  })

  it('una firma recien hecha es valida', () => {
    const ahora = T * 1000
    expect(verificarFirma(SECRETO, cabeceraFirma(SECRETO, CUERPO, ahora), CUERPO, ahora)).toEqual({ ok: true })
  })

  it('si cambia un solo caracter del cuerpo, no vale', () => {
    const ahora = T * 1000
    const r = verificarFirma(SECRETO, cabeceraFirma(SECRETO, CUERPO, ahora), '{"ping": true}', ahora)
    expect(r).toEqual({ ok: false, motivo: 'Firma invalida' })
  })

  it('con otro secreto, no vale', () => {
    const ahora = T * 1000
    const r = verificarFirma(SECRETO, cabeceraFirma('otro-secreto-cualquiera-de-32-caracteres!', CUERPO, ahora), CUERPO, ahora)
    expect(r.ok).toBe(false)
  })

  it('caduca a los 5 minutos: un lote capturado no se puede reenviar', () => {
    const firmada = cabeceraFirma(SECRETO, CUERPO, T * 1000)
    expect(verificarFirma(SECRETO, firmada, CUERPO, (T + 299) * 1000).ok).toBe(true)
    expect(verificarFirma(SECRETO, firmada, CUERPO, (T + 301) * 1000)).toEqual({ ok: false, motivo: 'Firma caducada' })
  })

  it('sin cabecera, o mal formada, no vale', () => {
    expect(verificarFirma(SECRETO, null, CUERPO)).toEqual({ ok: false, motivo: 'Falta la firma' })
    expect(verificarFirma(SECRETO, 't=abc,v1=xyz', CUERPO)).toEqual({ ok: false, motivo: 'Firma mal formada' })
  })

  it('sin secreto configurado no acepta nada', () => {
    expect(verificarFirma('', cabeceraFirma(SECRETO, CUERPO), CUERPO).ok).toBe(false)
  })
})
