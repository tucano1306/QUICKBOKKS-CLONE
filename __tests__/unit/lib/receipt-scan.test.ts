import {
  amountsInLine,
  extractDate,
  extractMerchant,
  extractTax,
  ocrScale,
  parseAmount,
  readReceipt,
} from '@/lib/receipt-scan'

// Ticket estadounidense típico: el total convive con subtotal, impuesto,
// efectivo entregado y cambio, y sólo uno de esos cinco es el gasto.
const US_RECEIPT = `WALMART SUPERCENTER
123 Main St
Miami, FL 33101
Tel: (305) 555-0142

03/14/2025  14:32

GROCERY
  MILK 2%           3.49
  BREAD             2.99
  EGGS DOZEN        4.29

SUBTOTAL          10.77
TAX  7.00%          0.75
TOTAL             11.52

CASH              20.00
CHANGE             8.48`

// Mismo caso en español y con separadores invertidos (1.432,09).
const ES_RECEIPT = `SUPERMERCADO EL SOL
RFC: ABC123456
14/03/2025

SUBTOTAL          1.234,56
IVA 16%             197,53
TOTAL A PAGAR     1.432,09
EFECTIVO          1.500,00
CAMBIO               67,91`

describe('parseAmount', () => {
  it('lee decimales con punto y con coma', () => {
    expect(parseAmount('12.99')).toBe(12.99)
    expect(parseAmount('12,99')).toBe(12.99)
    expect(parseAmount('$ 45.00')).toBe(45)
  })

  it('resuelve el separador decimal por el último que aparece', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56)
    expect(parseAmount('1.234,56')).toBe(1234.56)
  })

  it('trata como millares un separador seguido de tres cifras', () => {
    expect(parseAmount('1.500')).toBe(1500)
    expect(parseAmount('1,500')).toBe(1500)
    expect(parseAmount('1.234.567')).toBe(1234567)
  })

  it('descarta lo que no es un importe', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('TOTAL')).toBeNull()
    expect(parseAmount('0')).toBeNull()
  })
})

describe('amountsInLine', () => {
  it('devuelve los importes en orden de aparición', () => {
    expect(amountsInLine('2 x 3.50      7.00')).toEqual([3.5, 7])
  })

  it('no confunde un porcentaje con dinero', () => {
    expect(amountsInLine('TAX  7.00%          0.75')).toEqual([7, 0.75])
  })

  it('ignora enteros sueltos sin símbolo de moneda', () => {
    expect(amountsInLine('EGGS DOZEN 12')).toEqual([])
    expect(amountsInLine('EGGS DOZEN $12')).toEqual([12])
  })
})

describe('extractDate', () => {
  it('normaliza el formato ISO', () => {
    expect(extractDate('Fecha: 2025-03-14')).toBe('2025-03-14')
  })

  it('asume mes/día en las fechas numéricas ambiguas', () => {
    expect(extractDate('03/04/2025')).toBe('2025-03-04')
  })

  it('invierte el orden cuando la primera cifra sólo puede ser un día', () => {
    expect(extractDate('14/03/2025')).toBe('2025-03-14')
  })

  it('lee meses escritos con letras', () => {
    expect(extractDate('Mar 14, 2025')).toBe('2025-03-14')
    expect(extractDate('January 5, 2026')).toBe('2026-01-05')
  })

  it('rechaza días que no existen', () => {
    expect(extractDate('02/31/2025')).toBeNull()
  })

  it('devuelve null cuando no hay fecha', () => {
    expect(extractDate('TOTAL 11.52')).toBeNull()
  })
})

describe('extractMerchant', () => {
  it('toma el rótulo de la cabecera', () => {
    expect(extractMerchant(US_RECEIPT)).toBe('WALMART SUPERCENTER')
    expect(extractMerchant(ES_RECEIPT)).toBe('SUPERMERCADO EL SOL')
  })

  it('salta encabezados genéricos hasta dar con el negocio', () => {
    expect(extractMerchant('RECIBO DE COMPRA\nCAFE CENTRAL\n')).toBe('CAFE CENTRAL')
  })

  it('descarta el código de sucursal pero no el nombre que lleva "Store"', () => {
    expect(extractMerchant('STORE #4521\nTHE UPS STORE\n')).toBe('THE UPS STORE')
  })

  it('devuelve null si la cabecera no trae nombre', () => {
    expect(extractMerchant('12345\n67890\n')).toBeNull()
  })
})

describe('extractTax', () => {
  it('lee el impuesto desglosado en inglés y en español', () => {
    expect(extractTax(US_RECEIPT)).toBe(0.75)
    expect(extractTax(ES_RECEIPT)).toBe(197.53)
  })

  it('no confunde el identificador fiscal con un importe', () => {
    expect(extractTax('TAX ID 12.34\nTOTAL 50.00')).toBeNull()
  })
})

describe('readReceipt', () => {
  it('elige el total y no el subtotal, el impuesto ni el cambio', () => {
    const result = readReceipt(US_RECEIPT)
    expect(result.total).toBe(11.52)
    expect(result.quality).toBe('strong')
    expect(result.date).toBe('2025-03-14')
    expect(result.merchant).toBe('WALMART SUPERCENTER')
    expect(result.tax).toBe(0.75)
  })

  it('prefiere "TOTAL A PAGAR" y respeta los separadores españoles', () => {
    const result = readReceipt(ES_RECEIPT)
    expect(result.total).toBe(1432.09)
    expect(result.quality).toBe('strong')
    expect(result.date).toBe('2025-03-14')
  })

  it('ofrece los otros importes como alternativas', () => {
    const values = readReceipt(US_RECEIPT).candidates.map((c) => c.value)
    expect(values[0]).toBe(11.52)
    expect(values).toContain(10.77)
    expect(values).toContain(8.48)
    // El impuesto no compite por ser el total.
    expect(values).not.toContain(0.75)
  })

  it('no rellena el importe solo cuando no hay ninguna línea de total', () => {
    const result = readReceipt(`CAFE CENTRAL
Espresso        4.50
Croissant       3.25
CASH           10.00
CHANGE          2.25`)
    expect(result.quality).toBe('weak')
    expect(result.total).toBeNull()
    expect(result.candidates.length).toBeGreaterThan(0)
  })

  it('distingue una foto ilegible de una sin total', () => {
    const blank = readReceipt('')
    expect(blank.quality).toBe('none')
    expect(blank.hasText).toBe(false)

    const noAmounts = readReceipt('WALMART SUPERCENTER\nGRACIAS POR SU COMPRA')
    expect(noAmounts.quality).toBe('none')
    expect(noAmounts.hasText).toBe(true)
  })
})

describe('ocrScale', () => {
  it('amplía las fotos pequeñas y recorta las enormes', () => {
    expect(ocrScale(800)).toBeGreaterThan(1)
    expect(ocrScale(4000)).toBeLessThan(1)
    expect(ocrScale(1800)).toBe(1)
  })
})
