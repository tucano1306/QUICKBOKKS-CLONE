/**
 * Unit Tests - Idempotency Key Generation
 * 
 * Tests for unique key generation to prevent duplicate transactions
 */

// Use crypto instead of uuid for compatibility
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

describe('Idempotency Key Generation', () => {
  /**
   * Generate an idempotency key for a transaction
   */
  function generateIdempotencyKey(prefix: string = 'tx'): string {
    return `${prefix}_${generateUUID()}`
  }

  /**
   * Generate a deterministic idempotency key based on transaction details
   * This ensures the same transaction always gets the same key
   */
  function generateDeterministicKey(
    userId: string,
    action: string,
    entityId: string,
    timestamp: number
  ): string {
    const data = `${userId}:${action}:${entityId}:${timestamp}`
    // Simple hash function for demo (in production, use crypto)
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return `${action}_${Math.abs(hash).toString(16)}`
  }

  /**
   * Generate invoice number with idempotency
   */
  function generateInvoiceNumber(
    companyPrefix: string,
    sequenceNumber: number
  ): string {
    const year = new Date().getFullYear()
    const seq = sequenceNumber.toString().padStart(6, '0')
    return `${companyPrefix}-${year}-${seq}`
  }

  /**
   * Generate payment reference number
   */
  function generatePaymentReference(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `PAY-${timestamp}-${random}`.toUpperCase()
  }

  describe('generateIdempotencyKey', () => {
    it('should generate unique keys', () => {
      const key1 = generateIdempotencyKey()
      const key2 = generateIdempotencyKey()
      expect(key1).not.toBe(key2)
    })

    it('should use default prefix', () => {
      const key = generateIdempotencyKey()
      expect(key).toMatch(/^tx_/)
    })

    it('should use custom prefix', () => {
      const key = generateIdempotencyKey('payment')
      expect(key).toMatch(/^payment_/)
    })

    it('should have correct format (prefix_uuid)', () => {
      const key = generateIdempotencyKey('inv')
      expect(key).toMatch(/^inv_[a-f0-9-]{36}$/)
    })

    it('should generate valid UUID after prefix', () => {
      const key = generateIdempotencyKey()
      const uuid = key.split('_')[1]
      // UUID v4 format
      expect(uuid).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i)
    })
  })

  describe('generateDeterministicKey', () => {
    it('should generate same key for same inputs', () => {
      const timestamp = 1700000000000
      const key1 = generateDeterministicKey('user1', 'create_invoice', 'inv123', timestamp)
      const key2 = generateDeterministicKey('user1', 'create_invoice', 'inv123', timestamp)
      expect(key1).toBe(key2)
    })

    it('should generate different keys for different users', () => {
      const timestamp = 1700000000000
      const key1 = generateDeterministicKey('user1', 'create_invoice', 'inv123', timestamp)
      const key2 = generateDeterministicKey('user2', 'create_invoice', 'inv123', timestamp)
      expect(key1).not.toBe(key2)
    })

    it('should generate different keys for different actions', () => {
      const timestamp = 1700000000000
      const key1 = generateDeterministicKey('user1', 'create_invoice', 'inv123', timestamp)
      const key2 = generateDeterministicKey('user1', 'update_invoice', 'inv123', timestamp)
      expect(key1).not.toBe(key2)
    })

    it('should generate different keys for different timestamps', () => {
      const key1 = generateDeterministicKey('user1', 'create_invoice', 'inv123', 1700000000000)
      const key2 = generateDeterministicKey('user1', 'create_invoice', 'inv123', 1700000000001)
      expect(key1).not.toBe(key2)
    })

    it('should include action in key prefix', () => {
      const key = generateDeterministicKey('user1', 'create_payment', 'pay123', Date.now())
      expect(key).toMatch(/^create_payment_/)
    })
  })

  describe('generateInvoiceNumber', () => {
    it('should generate invoice number with correct format', () => {
      const invoiceNumber = generateInvoiceNumber('ABC', 1)
      const year = new Date().getFullYear()
      expect(invoiceNumber).toBe(`ABC-${year}-000001`)
    })

    it('should pad sequence number to 6 digits', () => {
      const invoiceNumber = generateInvoiceNumber('XYZ', 123)
      expect(invoiceNumber).toMatch(/-000123$/)
    })

    it('should handle large sequence numbers', () => {
      const invoiceNumber = generateInvoiceNumber('INV', 999999)
      expect(invoiceNumber).toMatch(/-999999$/)
    })

    it('should handle overflow sequence numbers', () => {
      const invoiceNumber = generateInvoiceNumber('INV', 1000000)
      expect(invoiceNumber).toMatch(/-1000000$/)
    })

    it('should use current year', () => {
      const invoiceNumber = generateInvoiceNumber('TEST', 1)
      const currentYear = new Date().getFullYear().toString()
      expect(invoiceNumber).toContain(currentYear)
    })
  })

  describe('generatePaymentReference', () => {
    it('should generate unique payment references', () => {
      const ref1 = generatePaymentReference()
      const ref2 = generatePaymentReference()
      expect(ref1).not.toBe(ref2)
    })

    it('should start with PAY- prefix', () => {
      const ref = generatePaymentReference()
      expect(ref).toMatch(/^PAY-/)
    })

    it('should be uppercase', () => {
      const ref = generatePaymentReference()
      expect(ref).toBe(ref.toUpperCase())
    })

    it('should have consistent length', () => {
      const references = Array.from({ length: 10 }, () => generatePaymentReference())
      const lengths = references.map(r => r.length)
      // All references should be roughly the same length (within a few characters)
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
      lengths.forEach(len => {
        expect(Math.abs(len - avgLength)).toBeLessThan(3)
      })
    })
  })

  describe('Collision Prevention', () => {
    it('should have very low collision rate for random keys', () => {
      const keys = new Set<string>()
      const iterations = 1000
      
      for (let i = 0; i < iterations; i++) {
        keys.add(generateIdempotencyKey())
      }
      
      // All keys should be unique
      expect(keys.size).toBe(iterations)
    })

    it('should have very low collision rate for payment references', () => {
      const refs = new Set<string>()
      const iterations = 100
      
      for (let i = 0; i < iterations; i++) {
        refs.add(generatePaymentReference())
      }
      
      // All references should be unique
      expect(refs.size).toBe(iterations)
    })
  })
})
