/**
 * Validation Utilities
 * 
 * Comprehensive validation functions for all data types in the system
 */

// ==================== TYPE DEFINITIONS ====================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  url?: boolean;
  custom?: (value: any) => string | null;
}

// ==================== BASIC VALIDATORS ====================

export function isEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function isCUID(id: string): boolean {
  // CUID format: starts with 'c' followed by timestamp and random chars
  return /^c[a-z0-9]{24}$/i.test(id);
}

export function isRFC(rfc: string): boolean {
  // Mexican RFC: 12-13 characters
  const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
  return rfcRegex.test(rfc.toUpperCase());
}

export function isEIN(ein: string): boolean {
  // US EIN: XX-XXXXXXX format
  const einRegex = /^\d{2}-?\d{7}$/;
  return einRegex.test(ein);
}

export function isSSN(ssn: string): boolean {
  // US SSN: XXX-XX-XXXX format
  const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
  return ssnRegex.test(ssn);
}

export function isPhoneNumber(phone: string): boolean {
  // International phone format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
}

export function isZipCode(zip: string, country: string = 'US'): boolean {
  if (country === 'US') {
    return /^\d{5}(-\d{4})?$/.test(zip);
  } else if (country === 'MX') {
    return /^\d{5}$/.test(zip);
  }
  return zip.length >= 3 && zip.length <= 10;
}

export function isCurrency(amount: string | number): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num >= 0 && num < 1e15;
}

// ==================== FIELD VALIDATORS ====================

export function validateField(
  fieldName: string,
  value: any,
  rules: ValidationRules
): string[] {
  const errors: string[] = [];

  // Required check
  if (rules.required && (value === null || value === undefined || value === '')) {
    errors.push(`${fieldName} es requerido`);
    return errors; // Stop validation if required field is missing
  }

  // Skip other validations if value is empty and not required
  if (!value && !rules.required) {
    return errors;
  }

  // String validations
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${fieldName} debe tener al menos ${rules.minLength} caracteres`);
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${fieldName} no puede exceder ${rules.maxLength} caracteres`);
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${fieldName} tiene un formato inválido`);
    }
    if (rules.email && !isEmail(value)) {
      errors.push(`${fieldName} debe ser un email válido`);
    }
    if (rules.url && !isURL(value)) {
      errors.push(`${fieldName} debe ser una URL válida`);
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${fieldName} debe ser al menos ${rules.min}`);
    }
    if (rules.max !== undefined && value > rules.max) {
      errors.push(`${fieldName} no puede exceder ${rules.max}`);
    }
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      errors.push(customError);
    }
  }

  return errors;
}

export function validateObject(
  data: Record<string, any>,
  schema: Record<string, ValidationRules>
): ValidationResult {
  const errors: string[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const fieldErrors = validateField(field, data[field], rules);
    errors.push(...fieldErrors);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ==================== BUSINESS LOGIC VALIDATORS ====================

/**
 * Validate company data
 */
export function validateCompany(data: any): ValidationResult {
  return validateObject(data, {
    name: { required: true, minLength: 2, maxLength: 100 },
    legalName: { required: true, minLength: 2, maxLength: 200 },
    taxId: { 
      required: true,
      custom: (value) => {
        if (data.country === 'MX' && !isRFC(value)) {
          return 'RFC inválido para México';
        }
        if (data.country === 'US' && !isEIN(value)) {
          return 'EIN inválido para Estados Unidos';
        }
        return null;
      }
    },
    email: { email: true },
    phone: { 
      custom: (value) => value && !isPhoneNumber(value) ? 'Teléfono inválido' : null 
    },
    zipCode: {
      custom: (value) => value && !isZipCode(value, data.country) ? 'Código postal inválido' : null
    },
  });
}

/**
 * Validate invoice data
 */
export function validateInvoice(data: any): ValidationResult {
  const errors: string[] = [];

  // Basic fields
  const basicValidation = validateObject(data, {
    customerId: { required: true },
    userId: { required: true },
    issueDate: { required: true },
    dueDate: { required: true },
    subtotal: { required: true, min: 0 },
    taxAmount: { required: true, min: 0 },
    total: { required: true, min: 0 },
  });
  errors.push(...basicValidation.errors);

  // Date validation
  if (data.issueDate && data.dueDate) {
    const issue = new Date(data.issueDate);
    const due = new Date(data.dueDate);
    if (due < issue) {
      errors.push('La fecha de vencimiento debe ser posterior a la fecha de emisión');
    }
  }

  // Amount validation
  if (data.subtotal !== undefined && data.taxAmount !== undefined && data.total !== undefined) {
    const calculatedTotal = parseFloat(data.subtotal) + parseFloat(data.taxAmount) - (parseFloat(data.discount) || 0);
    if (Math.abs(calculatedTotal - parseFloat(data.total)) > 0.01) {
      errors.push('El total no coincide con subtotal + impuestos - descuento');
    }
  }

  // Items validation
  if (data.items && Array.isArray(data.items)) {
    if (data.items.length === 0) {
      errors.push('La factura debe tener al menos un item');
    }
    data.items.forEach((item: any, index: number) => {
      const itemValidation = validateInvoiceItem(item);
      itemValidation.errors.forEach(err => {
        errors.push(`Item ${index + 1}: ${err}`);
      });
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate invoice item
 */
export function validateInvoiceItem(data: any): ValidationResult {
  return validateObject(data, {
    description: { required: true, minLength: 1, maxLength: 500 },
    quantity: { required: true, min: 0.001 },
    unitPrice: { required: true, min: 0 },
    amount: { required: true, min: 0 },
    taxRate: { required: true, min: 0, max: 1 },
  });
}

/**
 * Validate expense data
 */
export function validateExpense(data: any): ValidationResult {
  const validation = validateObject(data, {
    userId: { required: true },
    categoryId: { required: true },
    amount: { required: true, min: 0.01, max: 1e10 },
    date: { required: true },
    description: { required: true, minLength: 3, maxLength: 500 },
    paymentMethod: { required: true },
  });

  const errors = [...validation.errors];

  // Date validation
  if (data.date) {
    const expenseDate = new Date(data.date);
    const now = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setDate(maxFutureDate.getDate() + 30);
    
    if (expenseDate > maxFutureDate) {
      errors.push('La fecha del gasto no puede ser más de 30 días en el futuro');
    }
    
    const minPastDate = new Date();
    minPastDate.setFullYear(minPastDate.getFullYear() - 7);
    if (expenseDate < minPastDate) {
      errors.push('La fecha del gasto no puede ser más de 7 años en el pasado');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate customer data
 */
export function validateCustomer(data: any): ValidationResult {
  return validateObject(data, {
    name: { required: true, minLength: 2, maxLength: 200 },
    email: { email: true },
    phone: { 
      custom: (value) => value && !isPhoneNumber(value) ? 'Teléfono inválido' : null 
    },
    taxId: {
      custom: (value) => {
        if (!value) return null;
        if (data.country === 'MX' && !isRFC(value)) {
          return 'RFC inválido';
        }
        if (data.country === 'US' && !isEIN(value) && !isSSN(value)) {
          return 'EIN o SSN inválido';
        }
        return null;
      }
    },
  });
}

/**
 * Validate vendor data
 */
export function validateVendor(data: any): ValidationResult {
  return validateObject(data, {
    name: { required: true, minLength: 2, maxLength: 200 },
    contactName: { minLength: 2, maxLength: 200 },
    email: { email: true },
    phone: {
      custom: (value) => value && !isPhoneNumber(value) ? 'Teléfono inválido' : null,
    },
    taxId: {
      custom: (value) => {
        if (!value) return null;
        if (data.country === 'MX' && !isRFC(value)) {
          return 'RFC inválido';
        }
        if (data.country === 'US' && !isEIN(value)) {
          return 'EIN inválido';
        }
        return null;
      },
    },
    paymentTerms: { maxLength: 100 },
    category: { maxLength: 100 },
    status: {
      custom: (value) =>
        value && !['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(String(value).toUpperCase())
          ? 'Estado de proveedor inválido'
          : null,
    },
  });
}

/**
 * Validate vendor payable data
 */
export function validateVendorPayable(data: any): ValidationResult {
  const validation = validateObject(data, {
    vendorId: { required: true },
    billNumber: { required: true, minLength: 3, maxLength: 50 },
    issueDate: { required: true },
    dueDate: { required: true },
    subtotal: { min: 0 },
    taxAmount: { min: 0 },
    total: { required: true, min: 0.01 },
    paidAmount: { min: 0 },
  });

  const errors = [...validation.errors];

  if (data.issueDate && data.dueDate) {
    const issue = new Date(data.issueDate);
    const due = new Date(data.dueDate);
    if (due < issue) {
      errors.push('La fecha de vencimiento debe ser posterior a la fecha de emisión');
    }
  }

  if (data.total !== undefined && data.paidAmount !== undefined) {
    if (parseFloat(data.paidAmount) > parseFloat(data.total)) {
      errors.push('El monto pagado no puede exceder el total');
    }
  }

  if (data.subtotal !== undefined && data.taxAmount !== undefined && data.total !== undefined) {
    const subtotal = parseFloat(data.subtotal);
    const taxAmount = parseFloat(data.taxAmount);
    const total = parseFloat(data.total);
    if (subtotal + taxAmount - total > 0.01) {
      errors.push('El total debe coincidir con subtotal + impuestos');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

interface PurchaseOrderValidationOptions {
  partial?: boolean
}

export function validatePurchaseOrder(
  data: any,
  options: PurchaseOrderValidationOptions = {}
): ValidationResult {
  const errors: string[] = []
  const isPartial = options.partial ?? false

  if (!isPartial && !data.vendorId && !data.vendorName) {
    errors.push('Selecciona un proveedor o captura el nombre')
  }

  if (data.vendorName && data.vendorName.length < 2) {
    errors.push('El nombre del proveedor es demasiado corto')
  }

  if (!isPartial && !data.expectedDate) {
    errors.push('La fecha de entrega esperada es obligatoria')
  }

  if (data.orderDate && data.expectedDate) {
    const orderDate = new Date(data.orderDate)
    const expectedDate = new Date(data.expectedDate)
    if (expectedDate < orderDate) {
      errors.push('La fecha de entrega debe ser posterior a la fecha de pedido')
    }
  }

  if (data.total !== undefined && Number(data.total) < 0) {
    errors.push('El total de la orden debe ser mayor o igual a 0')
  }

  if (data.items) {
    if (!Array.isArray(data.items)) {
      errors.push('Los artículos deben ser una lista válida')
    } else {
      data.items.forEach((item: any, index: number) => {
        if (!item.description) {
          errors.push(`El artículo ${index + 1} requiere una descripción`)
        }
        if (Number(item.quantity) <= 0) {
          errors.push(`El artículo ${index + 1} debe tener una cantidad mayor a 0`)
        }
        if (Number(item.unitCost) < 0) {
          errors.push(`El artículo ${index + 1} debe tener un costo válido`)
        }
      })
    }
  } else if (!isPartial && (data.total === undefined || Number(data.total) <= 0)) {
    errors.push('Captura al menos un artículo o un total de la orden')
  }

  if (
    data.subtotal !== undefined &&
    data.tax !== undefined &&
    data.shipping !== undefined &&
    data.total !== undefined
  ) {
    const expectedTotal =
      Number(data.subtotal) + Number(data.tax) + Number(data.shipping)
    if (Math.abs(expectedTotal - Number(data.total)) > 0.5) {
      errors.push('El total debe coincidir con subtotal + impuestos + envío')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validatePurchaseHistoryRecord(data: any): ValidationResult {
  const validation = validateObject(data, {
    vendorId: { required: true },
    purchaseDate: { required: true },
    category: { maxLength: 100 },
    reference: { maxLength: 100 },
    description: { maxLength: 500 },
    subtotal: { min: 0 },
    taxAmount: { min: 0 },
    total: { required: true, min: 0.01 },
  })

  const errors = [...validation.errors]

  if (data.purchaseDate) {
    const purchaseDate = new Date(data.purchaseDate)
    if (Number.isNaN(purchaseDate.getTime())) {
      errors.push('Fecha de compra inválida')
    }
  }

  if (
    data.subtotal !== undefined &&
    data.taxAmount !== undefined &&
    data.total !== undefined
  ) {
    const subtotal = Number(data.subtotal)
    const taxAmount = Number(data.taxAmount)
    const total = Number(data.total)
    if (Math.abs(subtotal + taxAmount - total) > 0.5) {
      errors.push('El total debe coincidir con subtotal + impuestos')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validate user registration
 */
export function validateUserRegistration(data: any): ValidationResult {
  const errors: string[] = [];

  const basicValidation = validateObject(data, {
    name: { required: true, minLength: 2, maxLength: 100 },
    email: { required: true, email: true },
    password: { required: true, minLength: 8, maxLength: 100 },
  });
  errors.push(...basicValidation.errors);

  // Password strength
  if (data.password) {
    if (!/[a-z]/.test(data.password)) {
      errors.push('La contraseña debe contener al menos una letra minúscula');
    }
    if (!/[A-Z]/.test(data.password)) {
      errors.push('La contraseña debe contener al menos una letra mayúscula');
    }
    if (!/[0-9]/.test(data.password)) {
      errors.push('La contraseña debe contener al menos un número');
    }
  }

  // Confirm password
  if (data.password !== data.confirmPassword) {
    errors.push('Las contraseñas no coinciden');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate bank account
 */
export function validateBankAccount(data: any): ValidationResult {
  return validateObject(data, {
    userId: { required: true },
    bankName: { required: true, minLength: 2, maxLength: 100 },
    accountNumber: { required: true, minLength: 4, maxLength: 50 },
    accountType: { required: true },
    currency: { required: true },
    balance: { required: true },
  });
}

/**
 * Validate payroll data
 */
export function validatePayroll(data: any): ValidationResult {
  const errors: string[] = [];

  const basicValidation = validateObject(data, {
    employeeId: { required: true },
    userId: { required: true },
    periodStart: { required: true },
    periodEnd: { required: true },
    grossPay: { required: true, min: 0 },
    netPay: { required: true, min: 0 },
  });
  errors.push(...basicValidation.errors);

  // Date validation
  if (data.periodStart && data.periodEnd) {
    const start = new Date(data.periodStart);
    const end = new Date(data.periodEnd);
    if (end <= start) {
      errors.push('La fecha de fin debe ser posterior a la fecha de inicio');
    }
  }

  // Amount validation
  if (data.grossPay !== undefined && data.netPay !== undefined) {
    if (data.netPay > data.grossPay) {
      errors.push('El pago neto no puede ser mayor al pago bruto');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate API key creation
 */
export function validateApiKey(data: any): ValidationResult {
  return validateObject(data, {
    companyId: { required: true },
    name: { required: true, minLength: 3, maxLength: 100 },
    scopes: {
      required: true,
      custom: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'Debe especificar al menos un permiso';
        }
        return null;
      }
    },
  });
}

/**
 * Validate webhook creation
 */
export function validateWebhook(data: any): ValidationResult {
  const errors: string[] = [];

  const basicValidation = validateObject(data, {
    companyId: { required: true },
    url: { required: true, url: true },
    events: {
      required: true,
      custom: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'Debe especificar al menos un evento';
        }
        return null;
      }
    },
    secret: { required: true, minLength: 32 },
  });
  errors.push(...basicValidation.errors);

  // URL must be HTTPS in production
  if (data.url && process.env.NODE_ENV === 'production') {
    if (!data.url.startsWith('https://')) {
      errors.push('La URL del webhook debe usar HTTPS en producción');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate data export request
 */
export function validateDataExport(data: any): ValidationResult {
  const allowedTypes = ['FULL_BACKUP', 'INVOICES', 'EXPENSES', 'CUSTOMERS', 'PRODUCTS', 'REPORTS', 'AUDIT_TRAIL'];
  const allowedFormats = ['CSV', 'EXCEL', 'PDF', 'JSON', 'QUICKBOOKS_IIF', 'XERO_CSV'];

  return validateObject(data, {
    companyId: { required: true },
    userId: { required: true },
    type: {
      required: true,
      custom: (value) => !allowedTypes.includes(value) ? `Tipo inválido. Debe ser uno de: ${allowedTypes.join(', ')}` : null
    },
    format: {
      required: true,
      custom: (value) => !allowedFormats.includes(value) ? `Formato inválido. Debe ser uno de: ${allowedFormats.join(', ')}` : null
    },
  });
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: Date | string, endDate: Date | string): ValidationResult {
  const errors: string[] = [];

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    errors.push('Fecha de inicio inválida');
  }
  if (isNaN(end.getTime())) {
    errors.push('Fecha de fin inválida');
  }

  if (errors.length === 0 && end < start) {
    errors.push('La fecha de fin debe ser posterior a la fecha de inicio');
  }

  // Check for reasonable range (not more than 10 years)
  if (errors.length === 0) {
    const diffYears = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (diffYears > 10) {
      errors.push('El rango de fechas no puede exceder 10 años');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Sanitize string input (prevent XSS)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize object (recursively sanitize all string fields)
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

// ==================== VALIDATION HELPERS ====================

/**
 * Assert that a condition is true, throw error if false
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Validate and throw if invalid
 */
export function validateOrThrow(validation: ValidationResult): void {
  if (!validation.isValid) {
    throw new Error(validation.errors.join('; '));
  }
}

/**
 * Create a validation error response
 */
export function createValidationError(errors: string[]): { error: string; details: string[] } {
  return {
    error: 'Validation failed',
    details: errors,
  };
}
