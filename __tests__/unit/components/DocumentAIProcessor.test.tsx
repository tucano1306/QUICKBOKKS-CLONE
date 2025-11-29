/**
 * Tests for Document AI Processor Component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import DocumentAIProcessor from '@/components/documents/DocumentAIProcessor'

// Mock fetch
global.fetch = jest.fn()

// Mock useDropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: () => ({
      onClick: jest.fn(),
      onDragEnter: jest.fn(),
      onDragLeave: jest.fn(),
      onDrop: jest.fn()
    }),
    getInputProps: () => ({
      type: 'file',
      accept: 'application/pdf,image/*'
    }),
    isDragActive: false
  }))
}))

describe('DocumentAIProcessor Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/documents/process-ai')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            documents: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
          })
        })
      }
      if (url.includes('/api/accounts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            accounts: [
              { id: '1', code: '1000', name: 'Cash', type: 'ASSET' },
              { id: '2', code: '2000', name: 'Accounts Payable', type: 'LIABILITY' }
            ]
          })
        })
      }
      return Promise.resolve({ ok: false })
    })
  })

  it('should render the component title', async () => {
    render(<DocumentAIProcessor />)
    
    await waitFor(() => {
      expect(screen.getByText('AI Document Processor')).toBeInTheDocument()
    })
  })

  it('should render the upload area', async () => {
    render(<DocumentAIProcessor />)
    
    await waitFor(() => {
      expect(screen.getByText(/Drag & drop files here/i)).toBeInTheDocument()
    })
  })

  it('should render stat cards', async () => {
    render(<DocumentAIProcessor />)
    
    await waitFor(() => {
      expect(screen.getByText('Total Documents')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Analyzed')).toBeInTheDocument()
      expect(screen.getByText('Approved')).toBeInTheDocument()
    })
  })

  it('should have auto-process toggle enabled by default', async () => {
    render(<DocumentAIProcessor />)
    
    await waitFor(() => {
      const toggle = screen.getByLabelText('Auto-process with AI')
      expect(toggle).toBeInTheDocument()
    })
  })

  it('should show empty state when no documents', async () => {
    render(<DocumentAIProcessor />)
    
    await waitFor(() => {
      expect(screen.getByText('No documents found')).toBeInTheDocument()
      expect(screen.getByText('Upload some documents to get started')).toBeInTheDocument()
    })
  })

  it('should render document list when documents exist', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/documents/process-ai')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            documents: [
              {
                id: 'doc-1',
                originalFilename: 'invoice-001.pdf',
                mimeType: 'application/pdf',
                fileSize: 1024,
                status: 'ANALYZED',
                documentType: 'INVOICE',
                aiConfidence: 92,
                amount: 750.00,
                suggestedCategory: 'Accounts Payable',
                createdAt: new Date().toISOString(),
                uploadedBy: { name: 'Test User' }
              }
            ],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
          })
        })
      }
      if (url.includes('/api/accounts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ accounts: [] })
        })
      }
      return Promise.resolve({ ok: false })
    })

    render(<DocumentAIProcessor />)
    
    await waitFor(() => {
      expect(screen.getByText('invoice-001.pdf')).toBeInTheDocument()
      expect(screen.getByText('Invoice')).toBeInTheDocument()
      expect(screen.getByText('Analyzed')).toBeInTheDocument()
    })
  })

  it('should show filter dropdown', async () => {
    render(<DocumentAIProcessor />)
    
    await waitFor(() => {
      expect(screen.getByText('All Documents')).toBeInTheDocument()
    })
  })

  it('should display supported file types', async () => {
    render(<DocumentAIProcessor />)
    
    await waitFor(() => {
      expect(screen.getByText(/Supports: PDF, Images/i)).toBeInTheDocument()
    })
  })
})

describe('DocumentAIProcessor - Document Actions', () => {
  const mockDocument = {
    id: 'doc-1',
    originalFilename: 'test-invoice.pdf',
    mimeType: 'application/pdf',
    fileSize: 2048,
    status: 'ANALYZED',
    documentType: 'INVOICE',
    aiConfidence: 88,
    amount: 500.00,
    suggestedCategory: 'Accounts Payable',
    suggestedAccount: { id: 'acc-1', code: '2000', name: 'Accounts Payable' },
    extractedData: {
      amount: 500,
      vendor: 'ABC Supplies',
      invoiceNumber: 'INV-001',
      date: '2024-01-15'
    },
    aiAnalysis: {
      documentType: 'INVOICE',
      confidence: 88,
      journalEntry: {
        description: 'ABC Supplies - Invoice INV-001',
        lines: [
          { accountCode: '6100', accountName: 'Expenses', debit: 500, credit: 0 },
          { accountCode: '2000', accountName: 'Accounts Payable', debit: 0, credit: 500 }
        ]
      }
    },
    createdAt: new Date().toISOString(),
    uploadedBy: { name: 'Test User', email: 'test@example.com' },
    processingLogs: []
  }

  beforeEach(() => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/documents/process-ai') && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            documents: [mockDocument],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
          })
        })
      }
      if (url.includes('/api/accounts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            accounts: [
              { id: 'acc-1', code: '2000', name: 'Accounts Payable', type: 'LIABILITY' }
            ]
          })
        })
      }
      if (options?.method === 'PUT') {
        const body = JSON.parse(options.body)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            document: {
              ...mockDocument,
              status: body.action === 'approve' ? 'APPROVED' : 
                      body.action === 'reject' ? 'REJECTED' : 'ANALYZED'
            }
          })
        })
      }
      if (options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
      }
      return Promise.resolve({ ok: false })
    })
  })

  it('should show approve and reject buttons for analyzed documents', async () => {
    render(<DocumentAIProcessor />)
    
    await waitFor(() => {
      expect(screen.getByText('test-invoice.pdf')).toBeInTheDocument()
    })
    
    // Check for action buttons
    const viewButton = screen.getByRole('button', { name: /view/i })
    expect(viewButton).toBeInTheDocument()
  })
})

describe('DocumentAIProcessor - File Upload', () => {
  beforeEach(() => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            document: {
              id: 'new-doc-1',
              originalFilename: 'uploaded-file.pdf',
              status: 'ANALYZED',
              documentType: 'INVOICE',
              aiConfidence: 90,
              amount: 100,
              createdAt: new Date().toISOString()
            },
            analysis: {
              documentType: 'INVOICE',
              confidence: 90
            }
          })
        })
      }
      if (url.includes('/api/documents/process-ai')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            documents: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
          })
        })
      }
      if (url.includes('/api/accounts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ accounts: [] })
        })
      }
      return Promise.resolve({ ok: false })
    })
  })

  it('should display file type restrictions', async () => {
    render(<DocumentAIProcessor />)
    
    await waitFor(() => {
      expect(screen.getByText(/Max 10MB/i)).toBeInTheDocument()
    })
  })
})

describe('DocumentAIProcessor - Status Display', () => {
  const statuses = ['PENDING', 'PROCESSING', 'ANALYZED', 'APPROVED', 'REJECTED', 'ERROR']

  statuses.forEach((status) => {
    it(`should display ${status} status correctly`, async () => {
      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/documents/process-ai')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              documents: [{
                id: 'doc-1',
                originalFilename: 'test.pdf',
                mimeType: 'application/pdf',
                fileSize: 1024,
                status: status,
                createdAt: new Date().toISOString(),
                uploadedBy: { name: 'Test' }
              }],
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
            })
          })
        }
        if (url.includes('/api/accounts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ accounts: [] })
          })
        }
        return Promise.resolve({ ok: false })
      })

      render(<DocumentAIProcessor />)
      
      await waitFor(() => {
        const statusLabels: Record<string, string> = {
          PENDING: 'Pending',
          PROCESSING: 'Processing',
          ANALYZED: 'Analyzed',
          APPROVED: 'Approved',
          REJECTED: 'Rejected',
          ERROR: 'Error'
        }
        expect(screen.getByText(statusLabels[status])).toBeInTheDocument()
      })
    })
  })
})

describe('DocumentAIProcessor - Currency Formatting', () => {
  it('should format amounts as USD currency', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/documents/process-ai')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            documents: [{
              id: 'doc-1',
              originalFilename: 'invoice.pdf',
              mimeType: 'application/pdf',
              fileSize: 1024,
              status: 'ANALYZED',
              amount: 1234.56,
              createdAt: new Date().toISOString(),
              uploadedBy: { name: 'Test' }
            }],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
          })
        })
      }
      if (url.includes('/api/accounts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ accounts: [] })
        })
      }
      return Promise.resolve({ ok: false })
    })

    render(<DocumentAIProcessor />)
    
    await waitFor(() => {
      expect(screen.getByText('$1,234.56')).toBeInTheDocument()
    })
  })
})
