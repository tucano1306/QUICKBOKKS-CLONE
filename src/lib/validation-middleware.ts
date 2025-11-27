/**
 * API Validation Middleware
 * 
 * Middleware functions for validating API requests
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateCompany,
  validateInvoice,
  validateExpense,
  validateCustomer,
  validateVendor,
  validateVendorPayable,
  validatePurchaseOrder,
  validatePurchaseHistoryRecord,
  validateUserRegistration,
  validateBankAccount,
  validatePayroll,
  validateApiKey,
  validateWebhook,
  validateDataExport,
  sanitizeObject,
  createValidationError,
  ValidationResult,
} from './validation';

// ==================== TYPE DEFINITIONS ====================

export type ValidatorFunction = (data: any) => ValidationResult;

export interface ValidationMiddlewareOptions {
  sanitize?: boolean;
  allowPartial?: boolean; // For PATCH requests
}

// ==================== VALIDATION MIDDLEWARE ====================

/**
 * Validate request body using a validator function
 */
export async function validateRequest(
  request: NextRequest,
  validator: ValidatorFunction,
  options: ValidationMiddlewareOptions = {}
): Promise<{ data: any; error: NextResponse | null }> {
  try {
    // Parse request body
    const body = await request.json();
    
    // Sanitize input if requested
    let data = options.sanitize ? sanitizeObject(body) : body;
    
    // Run validation
    const validation = validator(data);
    
    if (!validation.isValid) {
      return {
        data: null,
        error: NextResponse.json(
          createValidationError(validation.errors),
          { status: 400 }
        ),
      };
    }
    
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams(
  request: NextRequest,
  requiredParams: string[] = [],
  optionalParams: string[] = []
): { params: Record<string, string>; error: NextResponse | null } {
  const searchParams = request.nextUrl.searchParams;
  const params: Record<string, string> = {};
  const errors: string[] = [];

  // Check required params
  for (const param of requiredParams) {
    const value = searchParams.get(param);
    if (!value) {
      errors.push(`Parámetro requerido faltante: ${param}`);
    } else {
      params[param] = value;
    }
  }

  // Get optional params
  for (const param of optionalParams) {
    const value = searchParams.get(param);
    if (value) {
      params[param] = value;
    }
  }

  if (errors.length > 0) {
    return {
      params: {},
      error: NextResponse.json(
        createValidationError(errors),
        { status: 400 }
      ),
    };
  }

  return { params, error: null };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(request: NextRequest): {
  page: number;
  limit: number;
  error: NextResponse | null;
} {
  const searchParams = request.nextUrl.searchParams;
  const pageStr = searchParams.get('page') || '1';
  const limitStr = searchParams.get('limit') || '10';

  const page = parseInt(pageStr, 10);
  const limit = parseInt(limitStr, 10);

  const errors: string[] = [];

  if (isNaN(page) || page < 1) {
    errors.push('page debe ser un número mayor a 0');
  }

  if (isNaN(limit) || limit < 1 || limit > 500) {
    errors.push('limit debe ser un número entre 1 y 500');
  }

  if (errors.length > 0) {
    return {
      page: 1,
      limit: 10,
      error: NextResponse.json(
        createValidationError(errors),
        { status: 400 }
      ),
    };
  }

  return { page, limit, error: null };
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): ValidationResult {
  const errors: string[] = [];
  const {
    maxSizeMB = 10,
    allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.csv', '.xls', '.xlsx'],
  } = options;

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    errors.push(`El archivo excede el tamaño máximo de ${maxSizeMB}MB`);
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Tipo de archivo no permitido: ${file.type}`);
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    errors.push(`Extensión de archivo no permitida: ${extension}`);
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Rate limiting validation
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; error: NextResponse | null } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    // Create new record
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, error: null };
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return {
      allowed: false,
      error: NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      ),
    };
  }

  // Increment count
  record.count++;
  return { allowed: true, error: null };
}

// ==================== SPECIFIC VALIDATORS ====================

/**
 * Validate company creation request
 */
export async function validateCompanyRequest(request: NextRequest) {
  return validateRequest(request, validateCompany, { sanitize: true });
}

/**
 * Validate invoice creation request
 */
export async function validateInvoiceRequest(request: NextRequest) {
  return validateRequest(request, validateInvoice, { sanitize: true });
}

/**
 * Validate expense creation request
 */
export async function validateExpenseRequest(request: NextRequest) {
  return validateRequest(request, validateExpense, { sanitize: true });
}

/**
 * Validate customer creation request
 */
export async function validateCustomerRequest(request: NextRequest) {
  return validateRequest(request, validateCustomer, { sanitize: true });
}

/**
 * Validate vendor creation request
 */
export async function validateVendorRequest(request: NextRequest) {
  return validateRequest(request, validateVendor, { sanitize: true });
}

/**
 * Validate vendor payable request
 */
export async function validateVendorPayableRequest(request: NextRequest) {
  return validateRequest(request, validateVendorPayable, { sanitize: true });
}

/**
 * Validate purchase order request
 */
export async function validatePurchaseOrderRequest(
  request: NextRequest,
  options: ValidationMiddlewareOptions = {}
) {
  return validateRequest(
    request,
    (data) => validatePurchaseOrder(data, { partial: options.allowPartial }),
    { sanitize: true }
  )
}

/**
 * Validate purchase history record request
 */
export async function validatePurchaseHistoryRecordRequest(request: NextRequest) {
  return validateRequest(request, validatePurchaseHistoryRecord, { sanitize: true })
}

/**
 * Validate user registration request
 */
export async function validateUserRegistrationRequest(request: NextRequest) {
  return validateRequest(request, validateUserRegistration, { sanitize: true });
}

/**
 * Validate bank account creation request
 */
export async function validateBankAccountRequest(request: NextRequest) {
  return validateRequest(request, validateBankAccount, { sanitize: true });
}

/**
 * Validate payroll creation request
 */
export async function validatePayrollRequest(request: NextRequest) {
  return validateRequest(request, validatePayroll, { sanitize: true });
}

/**
 * Validate API key creation request
 */
export async function validateApiKeyRequest(request: NextRequest) {
  return validateRequest(request, validateApiKey, { sanitize: true });
}

/**
 * Validate webhook creation request
 */
export async function validateWebhookRequest(request: NextRequest) {
  return validateRequest(request, validateWebhook, { sanitize: true });
}

/**
 * Validate data export request
 */
export async function validateDataExportRequest(request: NextRequest) {
  return validateRequest(request, validateDataExport, { sanitize: true });
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Extract user ID from request (from session or token)
 */
export async function extractUserId(request: NextRequest): Promise<string | null> {
  // This would typically get the user ID from the session/JWT
  // Implementation depends on your auth setup
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  // TODO: Implement proper JWT verification
  return null;
}

/**
 * Extract company ID from request
 */
export async function extractCompanyId(request: NextRequest): Promise<string | null> {
  // Can be from query param, header, or session
  const searchParams = request.nextUrl.searchParams;
  const companyId = searchParams.get('companyId') || request.headers.get('x-company-id');
  return companyId;
}

/**
 * Check if user has permission
 */
export async function checkPermission(
  userId: string,
  companyId: string,
  permission: string
): Promise<boolean> {
  // TODO: Implement with RBAC service
  return true;
}

/**
 * Validate UUID parameter
 */
export function validateUUIDParam(id: string, paramName: string = 'id'): ValidationResult {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return {
      isValid: false,
      errors: [`${paramName} inválido`],
    };
  }
  return { isValid: true, errors: [] };
}

/**
 * Validate CUID parameter
 */
export function validateCUIDParam(id: string, paramName: string = 'id'): ValidationResult {
  if (!/^c[a-z0-9]{24}$/i.test(id)) {
    return {
      isValid: false,
      errors: [`${paramName} inválido`],
    };
  }
  return { isValid: true, errors: [] };
}

/**
 * Create success response with data
 */
export function createSuccessResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Create error response
 */
export function createErrorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
