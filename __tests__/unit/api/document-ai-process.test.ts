/**
 * Tests for Document AI Processing API
 * 
 * Tests the complete document processing pipeline including:
 * - File upload
 * - OCR simulation
 * - AI analysis and categorization
 * - Journal entry suggestions
 */

// Mock groq-sdk before any imports
jest.mock('groq-sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{}' } }]
        })
      }
    }
  }))
}))

// Mock the groq-ai-service module
jest.mock('@/lib/groq-ai-service', () => ({
  analyzeDocumentWithAI: jest.fn().mockResolvedValue({
    documentType: 'INVOICE',
    vendor: 'Test Vendor',
    amount: 100,
    date: '2024-01-01',
    items: [],
    confidence: 0.95
  }),
  extractTextFromImage: jest.fn().mockResolvedValue('Sample extracted text')
}))

import { NextRequest } from 'next/server'
import { POST, GET, PUT, DELETE } from '@/app/api/documents/process-ai/route'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com'
    }
  }))
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    companyUser: {
      findFirst: jest.fn(() => Promise.resolve({
        companyId: 'company-123',
        company: { id: 'company-123', name: 'Test Company' }
      }))
    }
  }
}))

describe('Document AI Processing API', () => {
  describe('POST /api/documents/process-ai', () => {
    it('should reject requests without files', async () => {
      const formData = new FormData()
      
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'POST',
        body: formData
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('No file provided')
    })

    it('should process an invoice file correctly', async () => {
      const formData = new FormData()
      const file = new File(['test content'], 'invoice-test.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('autoProcess', 'true')
      
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'POST',
        body: formData
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.document).toBeDefined()
      expect(data.document.status).toBe('ANALYZED')
      expect(data.document.documentType).toBe('INVOICE')
      expect(data.analysis).toBeDefined()
      expect(data.analysis.documentType).toBe('INVOICE')
      expect(data.analysis.confidence).toBeGreaterThan(50)
    })

    it('should process a receipt file correctly', async () => {
      const formData = new FormData()
      const file = new File(['test content'], 'receipt-office.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('autoProcess', 'true')
      
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'POST',
        body: formData
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.document.documentType).toBe('RECEIPT')
    })

    it('should process a bank statement correctly', async () => {
      const formData = new FormData()
      const file = new File(['test content'], 'bank-statement-2024.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('autoProcess', 'true')
      
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'POST',
        body: formData
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.document.documentType).toBe('BANK_STATEMENT')
    })

    it('should set status to PENDING when autoProcess is false', async () => {
      const formData = new FormData()
      const file = new File(['test content'], 'document.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('autoProcess', 'false')
      
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'POST',
        body: formData
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.document.status).toBe('PENDING')
      expect(data.analysis).toBeNull()
    })

    it('should extract amount from invoice', async () => {
      const formData = new FormData()
      const file = new File(['test content'], 'invoice-500.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('autoProcess', 'true')
      
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'POST',
        body: formData
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.analysis.extractedData.amount).toBeDefined()
      expect(data.analysis.extractedData.amount).toBeGreaterThan(0)
    })

    it('should generate journal entry suggestion for invoices', async () => {
      const formData = new FormData()
      const file = new File(['test content'], 'invoice-test.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('autoProcess', 'true')
      
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'POST',
        body: formData
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.analysis.journalEntry).toBeDefined()
      expect(data.analysis.journalEntry.lines).toBeInstanceOf(Array)
      expect(data.analysis.journalEntry.lines.length).toBeGreaterThan(0)
      
      // Verify double-entry bookkeeping
      const totalDebits = data.analysis.journalEntry.lines.reduce((sum: number, l: any) => sum + l.debit, 0)
      const totalCredits = data.analysis.journalEntry.lines.reduce((sum: number, l: any) => sum + l.credit, 0)
      expect(totalDebits).toBe(totalCredits)
    })
  })

  describe('GET /api/documents/process-ai', () => {
    it('should return all documents', async () => {
      const request = new NextRequest('http://localhost/api/documents/process-ai')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.documents).toBeDefined()
      expect(Array.isArray(data.documents)).toBe(true)
    })

    it('should return a specific document by ID', async () => {
      // First, create a document
      const formData = new FormData()
      const file = new File(['test content'], 'test-doc.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('autoProcess', 'true')
      
      const createRequest = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'POST',
        body: formData
      })
      
      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const docId = createData.document.id
      
      // Then, fetch it
      const getRequest = new NextRequest(`http://localhost/api/documents/process-ai?id=${docId}`)
      
      const response = await GET(getRequest)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.document).toBeDefined()
      expect(data.document.id).toBe(docId)
    })

    it('should return 404 for non-existent document', async () => {
      const request = new NextRequest('http://localhost/api/documents/process-ai?id=non-existent-id')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(404)
      expect(data.error).toBe('Document not found')
    })
  })

  describe('PUT /api/documents/process-ai', () => {
    let testDocId: string

    beforeEach(async () => {
      // Create a test document
      const formData = new FormData()
      const file = new File(['test content'], 'test-doc.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('autoProcess', 'true')
      
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'POST',
        body: formData
      })
      
      const response = await POST(request)
      const data = await response.json()
      testDocId = data.document.id
    })

    it('should approve a document', async () => {
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: testDocId,
          action: 'approve'
        })
      })
      
      const response = await PUT(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.document.status).toBe('APPROVED')
    })

    it('should reject a document', async () => {
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: testDocId,
          action: 'reject'
        })
      })
      
      const response = await PUT(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.document.status).toBe('REJECTED')
    })

    it('should reprocess a document', async () => {
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: testDocId,
          action: 'reprocess'
        })
      })
      
      const response = await PUT(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.document.status).toBe('ANALYZED')
    })

    it('should return error for missing documentId', async () => {
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve'
        })
      })
      
      const response = await PUT(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing documentId or action')
    })
  })

  describe('DELETE /api/documents/process-ai', () => {
    it('should delete a document', async () => {
      // First, create a document
      const formData = new FormData()
      const file = new File(['test content'], 'to-delete.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('autoProcess', 'true')
      
      const createRequest = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'POST',
        body: formData
      })
      
      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const docId = createData.document.id
      
      // Then delete it
      const deleteRequest = new NextRequest(`http://localhost/api/documents/process-ai?id=${docId}`, {
        method: 'DELETE'
      })
      
      const response = await DELETE(deleteRequest)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verify it's deleted
      const getRequest = new NextRequest(`http://localhost/api/documents/process-ai?id=${docId}`)
      const getResponse = await GET(getRequest)
      expect(getResponse.status).toBe(404)
    })

    it('should return error for missing document ID', async () => {
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'DELETE'
      })
      
      const response = await DELETE(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing document ID')
    })
  })
})

describe('Document AI Analysis Logic', () => {
  describe('Document Classification', () => {
    it('should correctly classify invoice documents', async () => {
      const testFiles = [
        'invoice-2024.pdf',
        'factura-proveedor.pdf',
        'INV-12345.pdf'
      ]
      
      for (const filename of testFiles) {
        const formData = new FormData()
        const file = new File(['test'], filename, { type: 'application/pdf' })
        formData.append('file', file)
        formData.append('autoProcess', 'true')
        
        const request = new NextRequest('http://localhost/api/documents/process-ai', {
          method: 'POST',
          body: formData
        })
        
        const response = await POST(request)
        const data = await response.json()
        
        expect(data.document.documentType).toBe('INVOICE')
      }
    })

    it('should correctly classify receipt documents', async () => {
      const testFiles = [
        'receipt-store.pdf',
        'recibo-compra.pdf'
      ]
      
      for (const filename of testFiles) {
        const formData = new FormData()
        const file = new File(['test'], filename, { type: 'application/pdf' })
        formData.append('file', file)
        formData.append('autoProcess', 'true')
        
        const request = new NextRequest('http://localhost/api/documents/process-ai', {
          method: 'POST',
          body: formData
        })
        
        const response = await POST(request)
        const data = await response.json()
        
        expect(data.document.documentType).toBe('RECEIPT')
      }
    })
  })

  describe('Account Suggestions', () => {
    it('should suggest Accounts Payable for invoices', async () => {
      const formData = new FormData()
      const file = new File(['test'], 'invoice.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('autoProcess', 'true')
      
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'POST',
        body: formData
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.analysis.suggestedAccount.code).toBe('2000')
      expect(data.analysis.suggestedAccount.name).toBe('Accounts Payable')
    })

    it('should suggest Office Supplies for receipts', async () => {
      const formData = new FormData()
      const file = new File(['test'], 'receipt.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('autoProcess', 'true')
      
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'POST',
        body: formData
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.analysis.suggestedAccount.code).toBe('6100')
    })
  })

  describe('Florida Tax Handling', () => {
    it('should extract 7% Florida sales tax from documents', async () => {
      const formData = new FormData()
      const file = new File(['test'], 'invoice-florida.pdf', { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('autoProcess', 'true')
      
      const request = new NextRequest('http://localhost/api/documents/process-ai', {
        method: 'POST',
        body: formData
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      // The simulated data should include Florida 7% tax
      expect(data.analysis.extractedData.taxAmount).toBeDefined()
    })
  })
})
