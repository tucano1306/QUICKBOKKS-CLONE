/**
 * FASE 9: OCR Invoice Extraction Service
 * 
 * Extract invoice data from images and PDFs using OCR
 * - Tesseract.js for text recognition
 * - Pattern matching for invoice fields
 * - Validation and confidence scoring
 * - Support for multiple invoice formats
 */

import { prisma } from './prisma';

interface ExtractedInvoice {
  vendor: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  total: number;
  subtotal?: number;
  tax?: number;
  currency?: string;
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  confidence: number;
  rawText: string;
}

interface OCRResult {
  success: boolean;
  data?: ExtractedInvoice;
  error?: string;
  processingTime: number;
}

/**
 * Extract text from image using Tesseract.js
 * Note: In production, use actual Tesseract.js library
 */
async function extractTextFromImage(imagePath: string): Promise<string> {
  // Placeholder - In production, use:
  // const Tesseract = require('tesseract.js');
  // const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
  // return text;
  
  // For now, simulate OCR response
  throw new Error('Tesseract.js not initialized. Install with: npm install tesseract.js');
}

/**
 * Extract vendor name from text
 */
function extractVendor(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Vendor is usually in the first few lines
  // Look for lines that don't contain common invoice keywords
  const excludeKeywords = ['invoice', 'bill', 'receipt', 'total', 'subtotal', 'tax', 'date', 'due'];
  
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    const hasExcluded = excludeKeywords.some(kw => line.toLowerCase().includes(kw));
    
    if (!hasExcluded && line.length > 3 && line.length < 100) {
      return line;
    }
  }
  
  return lines[0] || null;
}

/**
 * Extract invoice number
 */
function extractInvoiceNumber(text: string): string | null {
  // Pattern: Invoice #123, Invoice No: 123, INV-123, etc.
  const patterns = [
    /invoice\s*[#:]?\s*(\w+[-]?\w+)/i,
    /inv[#:]?\s*(\w+[-]?\w+)/i,
    /bill\s*[#:]?\s*(\w+[-]?\w+)/i,
    /receipt\s*[#:]?\s*(\w+[-]?\w+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Extract dates from text
 */
function extractDates(text: string): { invoiceDate: Date | null; dueDate: Date | null } {
  let invoiceDate: Date | null = null;
  let dueDate: Date | null = null;
  
  // Date patterns
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4}/gi,
  ];
  
  const dates: Date[] = [];
  
  for (const pattern of datePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      try {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime())) {
          dates.push(date);
        }
      } catch {
        // Invalid date, skip
      }
    }
  }
  
  // Look for context keywords
  const invoiceDatePatterns = [
    /invoice\s+date[:\s]+([^\n]+)/i,
    /date[:\s]+([^\n]+)/i,
    /issued[:\s]+([^\n]+)/i,
  ];
  
  const dueDatePatterns = [
    /due\s+date[:\s]+([^\n]+)/i,
    /payment\s+due[:\s]+([^\n]+)/i,
  ];
  
  for (const pattern of invoiceDatePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          invoiceDate = date;
          break;
        }
      } catch {
        // Invalid date
      }
    }
  }
  
  for (const pattern of dueDatePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          dueDate = date;
          break;
        }
      } catch {
        // Invalid date
      }
    }
  }
  
  // Fallback: use first two dates found
  if (!invoiceDate && dates.length > 0) {
    invoiceDate = dates[0];
  }
  if (!dueDate && dates.length > 1) {
    dueDate = dates[1];
  }
  
  return { invoiceDate, dueDate };
}

/**
 * Extract monetary amounts
 */
function extractAmounts(text: string): { total: number | null; subtotal: number | null; tax: number | null } {
  let total: number | null = null;
  let subtotal: number | null = null;
  let tax: number | null = null;
  
  // Amount pattern: $1,234.56 or 1234.56
  const amountPattern = /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
  
  // Total patterns
  const totalPatterns = [
    /total[:\s]+\$?\s*([\d,]+\.?\d{0,2})/i,
    /amount\s+due[:\s]+\$?\s*([\d,]+\.?\d{0,2})/i,
    /balance\s+due[:\s]+\$?\s*([\d,]+\.?\d{0,2})/i,
  ];
  
  // Subtotal patterns
  const subtotalPatterns = [
    /subtotal[:\s]+\$?\s*([\d,]+\.?\d{0,2})/i,
    /sub-total[:\s]+\$?\s*([\d,]+\.?\d{0,2})/i,
  ];
  
  // Tax patterns
  const taxPatterns = [
    /tax[:\s]+\$?\s*([\d,]+\.?\d{0,2})/i,
    /vat[:\s]+\$?\s*([\d,]+\.?\d{0,2})/i,
    /sales\s+tax[:\s]+\$?\s*([\d,]+\.?\d{0,2})/i,
  ];
  
  // Extract total
  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      total = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // Extract subtotal
  for (const pattern of subtotalPatterns) {
    const match = text.match(pattern);
    if (match) {
      subtotal = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // Extract tax
  for (const pattern of taxPatterns) {
    const match = text.match(pattern);
    if (match) {
      tax = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // If no total but have subtotal and tax, calculate
  if (!total && subtotal && tax) {
    total = subtotal + tax;
  }
  
  // If no subtotal but have total and tax, calculate
  if (!subtotal && total && tax) {
    subtotal = total - tax;
  }
  
  return { total, subtotal, tax };
}

/**
 * Extract line items from invoice
 */
function extractLineItems(text: string): Array<{
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
}> {
  const lineItems: Array<any> = [];
  
  // Look for table-like structure
  const lines = text.split('\n');
  
  // Common line item patterns
  // Format: Description Qty Price Amount
  const itemPattern = /^(.+?)\s+(\d+)\s+\$?([\d,]+\.?\d{0,2})\s+\$?([\d,]+\.?\d{0,2})$/;
  
  for (const line of lines) {
    const match = line.trim().match(itemPattern);
    if (match) {
      lineItems.push({
        description: match[1].trim(),
        quantity: parseInt(match[2]),
        unitPrice: parseFloat(match[3].replace(/,/g, '')),
        amount: parseFloat(match[4].replace(/,/g, '')),
      });
    }
  }
  
  return lineItems;
}

/**
 * Calculate confidence score for extraction
 */
function calculateConfidence(data: Partial<ExtractedInvoice>): number {
  let score = 0;
  let maxScore = 0;
  
  // Vendor (30 points)
  maxScore += 30;
  if (data.vendor && data.vendor.length > 3) {
    score += 30;
  }
  
  // Total amount (40 points)
  maxScore += 40;
  if (data.total && data.total > 0) {
    score += 40;
  }
  
  // Invoice date (10 points)
  maxScore += 10;
  if (data.invoiceDate) {
    score += 10;
  }
  
  // Invoice number (10 points)
  maxScore += 10;
  if (data.invoiceNumber) {
    score += 10;
  }
  
  // Line items (10 points)
  maxScore += 10;
  if (data.lineItems && data.lineItems.length > 0) {
    score += 10;
  }
  
  return score / maxScore;
}

/**
 * Extract invoice data from image
 */
export async function extractInvoiceFromImage(
  companyId: string,
  imagePath: string,
  userId?: string
): Promise<OCRResult> {
  const startTime = Date.now();
  
  try {
    // Extract text using OCR
    const text = await extractTextFromImage(imagePath);
    
    // Extract invoice fields
    const vendor = extractVendor(text);
    const invoiceNumber = extractInvoiceNumber(text);
    const { invoiceDate, dueDate } = extractDates(text);
    const { total, subtotal, tax } = extractAmounts(text);
    const lineItems = extractLineItems(text);
    
    if (!vendor || !total) {
      throw new Error('Could not extract required fields (vendor and total)');
    }
    
    const extractedData: ExtractedInvoice = {
      vendor,
      invoiceNumber: invoiceNumber || undefined,
      invoiceDate: invoiceDate || undefined,
      dueDate: dueDate || undefined,
      total,
      subtotal: subtotal || undefined,
      tax: tax || undefined,
      lineItems: lineItems.length > 0 ? lineItems : undefined,
      confidence: 0,
      rawText: text,
    };
    
    extractedData.confidence = calculateConfidence(extractedData);
    
    const processingTime = Date.now() - startTime;
    
    // Log extraction
    await (prisma as any).predictionLog.create({
      data: {
        modelId: await getOrCreateOCRModel(companyId),
        companyId,
        userId,
        inputData: {
          imagePath,
          textLength: text.length,
        },
        prediction: extractedData,
        confidence: extractedData.confidence > 0.8 ? 'VERY_HIGH' :
                   extractedData.confidence > 0.6 ? 'HIGH' :
                   extractedData.confidence > 0.4 ? 'MEDIUM' : 'LOW',
        confidenceScore: extractedData.confidence,
        processingTime,
      },
    });
    
    return {
      success: true,
      data: extractedData,
      processingTime,
    };
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    return {
      success: false,
      error: error.message,
      processingTime,
    };
  }
}

/**
 * Get or create OCR model record
 */
async function getOrCreateOCRModel(companyId: string): Promise<string> {
  let model = await (prisma as any).aIModel.findFirst({
    where: {
      companyId,
      type: 'INVOICE_OCR',
    },
  });
  
  if (!model) {
    model = await (prisma as any).aIModel.create({
      data: {
        companyId,
        type: 'INVOICE_OCR',
        name: 'Invoice OCR Extractor',
        description: 'Extract invoice data from images using OCR',
        status: 'READY',
        version: '1.0.0',
      },
    });
  }
  
  return model.id;
}

/**
 * Extract invoice from PDF
 */
export async function extractInvoiceFromPDF(
  companyId: string,
  pdfPath: string,
  userId?: string
): Promise<OCRResult> {
  // In production, use pdf-parse or similar library to extract text
  // Then use the same extraction logic as images
  
  throw new Error('PDF extraction not yet implemented. Install pdf-parse: npm install pdf-parse');
}

/**
 * Batch process multiple invoices
 */
export async function batchExtractInvoices(
  companyId: string,
  imagePaths: string[],
  userId?: string
) {
  const results = [];
  
  for (const imagePath of imagePaths) {
    const result = await extractInvoiceFromImage(companyId, imagePath, userId);
    results.push({
      imagePath,
      ...result,
    });
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    total: results.length,
    successful,
    failed,
    results,
  };
}

/**
 * Validate extracted invoice data
 */
export function validateExtractedInvoice(data: ExtractedInvoice): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!data.vendor || data.vendor.length < 3) {
    errors.push('Vendor name is required and must be at least 3 characters');
  }
  
  if (!data.total || data.total <= 0) {
    errors.push('Total amount is required and must be greater than 0');
  }
  
  // Warnings
  if (!data.invoiceDate) {
    warnings.push('Invoice date not found');
  }
  
  if (!data.invoiceNumber) {
    warnings.push('Invoice number not found');
  }
  
  if (data.subtotal && data.tax && data.total) {
    const calculated = data.subtotal + data.tax;
    const difference = Math.abs(calculated - data.total);
    
    if (difference > 0.01) {
      warnings.push(`Total (${data.total}) does not match subtotal + tax (${calculated})`);
    }
  }
  
  if (data.invoiceDate && data.dueDate) {
    if (data.dueDate < data.invoiceDate) {
      errors.push('Due date cannot be before invoice date');
    }
  }
  
  if (data.confidence < 0.5) {
    warnings.push('Low confidence extraction - manual review recommended');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create invoice from extracted data
 */
export async function createInvoiceFromExtraction(
  companyId: string,
  extraction: ExtractedInvoice,
  userId: string
) {
  const validation = validateExtractedInvoice(extraction);
  
  if (!validation.isValid) {
    throw new Error(`Invalid invoice data: ${validation.errors.join(', ')}`);
  }
  
  // Find or create customer/vendor by name
  // Note: Customer model doesn't have companyId - customers are shared across system
  let customer = await prisma.customer.findFirst({
    where: {
      name: extraction.vendor,
    },
  });
  
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: extraction.vendor,
        company: extraction.vendor, // Store vendor name in company field
        email: '',
        phone: '',
        status: 'ACTIVE',
      },
    });
  }
  
  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      userId: companyId,
      customerId: customer.id,
      invoiceNumber: extraction.invoiceNumber || `INV-${Date.now()}`,
      issueDate: extraction.invoiceDate || new Date(),
      dueDate: extraction.dueDate || new Date(),
      subtotal: extraction.subtotal || extraction.total,
      taxAmount: extraction.tax || 0,
      total: extraction.total,
      status: 'DRAFT',
      notes: `Auto-extracted from image (confidence: ${(extraction.confidence * 100).toFixed(0)}%)`,
      paymentMethod: 'CHECK',
      salesTaxRate: 0,
      exchangeRate: 1,
    },
  });
  
  // Create line items if available
  if (extraction.lineItems && extraction.lineItems.length > 0) {
    for (const item of extraction.lineItems) {
      // Note: InvoiceItem requires productId, taxRate, taxAmount
      // Skipping for now due to schema requirements
      /*
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          productId: 'default-product-id',
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.amount,
          taxRate: 0,
          taxAmount: 0,
          total: item.amount,
        },
      });
      */
    }
  }
  
  return {
    invoice,
    customer,
    validation,
  };
}

/**
 * Get OCR statistics
 */
export async function getOCRStats(companyId: string) {
  const logs = await (prisma as any).predictionLog.findMany({
    where: {
      companyId,
      model: {
        type: 'INVOICE_OCR',
      },
    },
    take: 100,
    orderBy: { createdAt: 'desc' },
  });
  
  if (logs.length === 0) {
    return {
      totalExtractions: 0,
      averageConfidence: 0,
      averageProcessingTime: 0,
      successRate: 0,
    };
  }
  
  const totalConfidence = logs.reduce((sum: number, log: any) => sum + log.confidenceScore, 0);
  const totalTime = logs.reduce((sum: number, log: any) => sum + (log.processingTime || 0), 0);
  const successful = logs.filter((log: any) => log.confidenceScore >= 0.5).length;
  
  return {
    totalExtractions: logs.length,
    averageConfidence: totalConfidence / logs.length,
    averageProcessingTime: totalTime / logs.length,
    successRate: successful / logs.length,
  };
}
