# Sistema de Validación Completo - QuickBooks Clone

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura de Validación](#arquitectura-de-validación)
3. [Validadores Implementados](#validadores-implementados)
4. [Middleware de Validación](#middleware-de-validación)
5. [Seguridad y Sanitización](#seguridad-y-sanitización)
6. [Uso en Rutas API](#uso-en-rutas-api)
7. [Ejemplos de Uso](#ejemplos-de-uso)
8. [Mejores Prácticas](#mejores-prácticas)

---

## Descripción General

El sistema de validación proporciona una capa completa de validación de datos en tres niveles:

1. **Validación de Entrada**: Verifica tipos de datos, formatos y valores permitidos
2. **Validación de Negocio**: Aplica reglas de negocio (fechas, montos, relaciones)
3. **Sanitización**: Previene ataques XSS, SQL Injection y otros vectores de ataque

### Características Principales

- ✅ Validación de tipos de datos (email, URL, UUID, CUID, RFC, EIN, SSN, teléfono)
- ✅ Validación de reglas de negocio (montos, fechas, relaciones)
- ✅ Sanitización automática de inputs
- ✅ Rate limiting por IP/usuario
- ✅ Validación de archivos subidos
- ✅ Paginación validada
- ✅ Mensajes de error en español
- ✅ Respuestas consistentes

---

## Arquitectura de Validación

```
src/lib/
├── validation.ts              # Funciones de validación base
└── validation-middleware.ts   # Middleware para rutas API

Flujo de Validación:
Request → Middleware → Sanitización → Validación → Business Logic → Response
```

### Componentes

#### 1. validation.ts

Contiene todas las funciones de validación base:

```typescript
// Validadores básicos
isEmail(email: string): boolean
isURL(url: string): boolean
isUUID(id: string): boolean
isCUID(id: string): boolean
isRFC(rfc: string): boolean
isEIN(ein: string): boolean
isSSN(ssn: string): boolean
isPhoneNumber(phone: string): boolean
isZipCode(zip: string, country: string): boolean
isCurrency(amount: string | number): boolean

// Validadores de objetos completos
validateCompany(data: any): ValidationResult
validateInvoice(data: any): ValidationResult
validateExpense(data: any): ValidationResult
validateCustomer(data: any): ValidationResult
validateUserRegistration(data: any): ValidationResult
validateBankAccount(data: any): ValidationResult
validatePayroll(data: any): ValidationResult
validateApiKey(data: any): ValidationResult
validateWebhook(data: any): ValidationResult
validateDataExport(data: any): ValidationResult
validateDateRange(start: Date, end: Date): ValidationResult

// Sanitización
sanitizeString(input: string): string
sanitizeObject(obj: any): any
```

#### 2. validation-middleware.ts

Middleware para integración en rutas API:

```typescript
// Validación de requests
validateRequest(request, validator, options): Promise<{data, error}>
validateQueryParams(request, required, optional): {params, error}
validatePagination(request): {page, limit, error}
validateFileUpload(file, options): ValidationResult

// Rate limiting
checkRateLimit(identifier, maxRequests, windowMs): {allowed, error}

// Validadores específicos
validateCompanyRequest(request): Promise<{data, error}>
validateInvoiceRequest(request): Promise<{data, error}>
validateExpenseRequest(request): Promise<{data, error}>
// ... más validadores
```

---

## Validadores Implementados

### 1. Validación de Empresa (Company)

```typescript
validateCompany(data: {
  name: string;              // required, 2-100 chars
  legalName: string;         // required, 2-200 chars
  taxId: string;             // required, RFC (MX) o EIN (US)
  email?: string;            // optional, valid email
  phone?: string;            // optional, valid phone
  zipCode?: string;          // optional, valid by country
  country: string;           // required for tax validation
})
```

**Validaciones:**
- Nombre y razón social requeridos
- Tax ID validado según país (RFC para México, EIN para USA)
- Email válido si se proporciona
- Teléfono en formato internacional
- Código postal válido por país

### 2. Validación de Factura (Invoice)

```typescript
validateInvoice(data: {
  customerId: string;        // required
  userId: string;            // required
  issueDate: Date;           // required
  dueDate: Date;             // required, debe ser >= issueDate
  subtotal: number;          // required, >= 0
  taxAmount: number;         // required, >= 0
  total: number;             // required, debe coincidir con cálculo
  discount?: number;         // optional, >= 0
  items: InvoiceItem[];      // required, min 1 item
})
```

**Validaciones:**
- Fechas requeridas y coherentes (vencimiento >= emisión)
- Montos positivos
- Total calculado = subtotal + impuestos - descuento (±0.01 tolerancia)
- Al menos 1 item en la factura
- Cada item validado individualmente

**Item Validations:**
```typescript
validateInvoiceItem({
  description: string;       // required, 1-500 chars
  quantity: number;          // required, > 0
  unitPrice: number;         // required, >= 0
  amount: number;            // required, >= 0
  taxRate: number;           // required, 0-1 (0-100%)
})
```

### 3. Validación de Gasto (Expense)

```typescript
validateExpense(data: {
  userId: string;            // required
  categoryId: string;        // required
  amount: number;            // required, 0.01 - 10B
  date: Date;                // required, -7 años a +30 días
  description: string;       // required, 3-500 chars
  paymentMethod: string;     // required
})
```

**Validaciones:**
- Monto positivo y razonable (0.01 a 10 mil millones)
- Fecha del gasto no más de 7 años en el pasado
- Fecha del gasto no más de 30 días en el futuro
- Descripción mínima de 3 caracteres
- Método de pago requerido

### 4. Validación de Cliente (Customer)

```typescript
validateCustomer(data: {
  name: string;              // required, 2-200 chars
  email?: string;            // optional, valid email
  phone?: string;            // optional, valid phone
  taxId?: string;            // optional, RFC/EIN/SSN según país
  country?: string;          // for tax ID validation
})
```

**Validaciones:**
- Nombre requerido mínimo 2 caracteres
- Email válido si se proporciona
- Teléfono en formato internacional
- Tax ID validado según país si se proporciona

### 5. Validación de Registro de Usuario

```typescript
validateUserRegistration(data: {
  name: string;              // required, 2-100 chars
  email: string;             // required, valid email
  password: string;          // required, 8-100 chars
  confirmPassword: string;   // required, must match password
})
```

**Validaciones de Contraseña:**
- Mínimo 8 caracteres
- Al menos 1 letra minúscula
- Al menos 1 letra mayúscula
- Al menos 1 número
- Confirmación debe coincidir

### 6. Validación de Cuenta Bancaria

```typescript
validateBankAccount(data: {
  userId: string;            // required
  bankName: string;          // required, 2-100 chars
  accountNumber: string;     // required, 4-50 chars
  accountType: string;       // required
  currency: string;          // required
  balance: number;           // required
})
```

### 7. Validación de Nómina (Payroll)

```typescript
validatePayroll(data: {
  employeeId: string;        // required
  userId: string;            // required
  periodStart: Date;         // required
  periodEnd: Date;           // required, > periodStart
  grossPay: number;          // required, >= 0
  netPay: number;            // required, 0 <= netPay <= grossPay
})
```

**Validaciones:**
- Fechas de periodo coherentes (fin > inicio)
- Pago neto no puede exceder pago bruto
- Montos positivos

### 8. Validación de API Key

```typescript
validateApiKey(data: {
  companyId: string;         // required
  name: string;              // required, 3-100 chars
  scopes: string[];          // required, min 1 scope
})
```

### 9. Validación de Webhook

```typescript
validateWebhook(data: {
  companyId: string;         // required
  url: string;               // required, valid URL, HTTPS en producción
  events: string[];          // required, min 1 event
  secret: string;            // required, min 32 chars
})
```

**Validaciones:**
- URL debe ser HTTPS en producción
- Secret mínimo 32 caracteres para seguridad
- Al menos 1 evento suscrito

### 10. Validación de Exportación de Datos

```typescript
validateDataExport(data: {
  companyId: string;         // required
  userId: string;            // required
  type: ExportType;          // FULL_BACKUP | INVOICES | EXPENSES | ...
  format: ExportFormat;      // CSV | EXCEL | PDF | JSON | ...
})
```

**Tipos permitidos:**
- FULL_BACKUP
- INVOICES
- EXPENSES
- CUSTOMERS
- PRODUCTS
- REPORTS
- AUDIT_TRAIL

**Formatos permitidos:**
- CSV
- EXCEL
- PDF
- JSON
- QUICKBOOKS_IIF
- XERO_CSV

---

## Middleware de Validación

### validateRequest

Valida el body de la petición usando una función validadora:

```typescript
const { data, error } = await validateRequest(
  request,
  validateInvoice,
  { sanitize: true }
);

if (error) return error;
// Usar data validado
```

### validatePagination

Valida parámetros de paginación:

```typescript
const { page, limit, error } = validatePagination(request);
if (error) return error;

// page: 1-N (default: 1)
// limit: 1-100 (default: 10)
```

### validateFileUpload

Valida archivos subidos:

```typescript
const validation = validateFileUpload(file, {
  maxSizeMB: 10,
  allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  allowedExtensions: ['.pdf', '.jpg', '.png'],
});

if (!validation.isValid) {
  return createErrorResponse(validation.errors.join('; '), 400);
}
```

### checkRateLimit

Implementa rate limiting:

```typescript
const { allowed, error } = checkRateLimit(
  userId,          // Identificador único
  100,             // Max requests
  60000            // Ventana en ms (1 minuto)
);

if (!allowed) return error;
```

---

## Seguridad y Sanitización

### Prevención de XSS

```typescript
// Remueve caracteres peligrosos
sanitizeString("Hello <script>alert('xss')</script>")
// → "Hello alert('xss')"

// Remueve < > javascript: on*=
```

### Sanitización de Objetos

```typescript
// Sanitiza recursivamente todos los strings
const clean = sanitizeObject({
  name: "John <script>",
  email: "john@example.com",
  nested: {
    value: "Test <img onerror=alert(1)>"
  }
});
// Todos los strings sanitizados
```

### Prevención de SQL Injection

- **Prisma ORM**: Usa prepared statements automáticamente
- **Validación de IDs**: UUID/CUID validados antes de queries
- **Input Sanitization**: Limpieza de caracteres especiales

---

## Uso en Rutas API

### Ejemplo: POST /api/invoices

```typescript
import { validateInvoiceRequest } from '@/lib/validation-middleware';

export async function POST(request: NextRequest) {
  // 1. Verificar autenticación
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // 2. Validar request con sanitización
  const { data, error } = await validateInvoiceRequest(request);
  if (error) return error;

  // 3. Usar datos validados
  const invoice = await prisma.invoice.create({
    data: {
      ...data,
      userId: session.user.id,
    },
  });

  return NextResponse.json(invoice, { status: 201 });
}
```

### Ejemplo: GET con Paginación

```typescript
import { validatePagination } from '@/lib/validation-middleware';

export async function GET(request: NextRequest) {
  // Validar paginación
  const { page, limit, error } = validatePagination(request);
  if (error) return error;

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({ skip, take: limit }),
    prisma.invoice.count(),
  ]);

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
```

### Ejemplo: Rate Limiting

```typescript
import { checkRateLimit } from '@/lib/validation-middleware';

export async function POST(request: NextRequest) {
  const userId = session.user.id;

  // Limitar a 100 requests por minuto
  const { allowed, error } = checkRateLimit(userId, 100, 60000);
  if (!allowed) return error;

  // Continuar con la lógica...
}
```

---

## Ejemplos de Uso

### Validación Manual

```typescript
import { validateInvoice, validateOrThrow } from '@/lib/validation';

// Opción 1: Verificar resultado
const validation = validateInvoice(data);
if (!validation.isValid) {
  console.error(validation.errors);
  return;
}

// Opción 2: Lanzar error si inválido
try {
  validateOrThrow(validateInvoice(data));
  // Continuar con datos válidos
} catch (error) {
  console.error(error.message);
}
```

### Validación de Campos

```typescript
import { validateField } from '@/lib/validation';

const errors = validateField('email', userInput, {
  required: true,
  email: true,
  maxLength: 100,
});

if (errors.length > 0) {
  console.error(errors);
}
```

### Validación de Objeto con Schema

```typescript
import { validateObject } from '@/lib/validation';

const validation = validateObject(data, {
  name: { required: true, minLength: 2, maxLength: 100 },
  age: { required: true, min: 18, max: 120 },
  email: { required: true, email: true },
  website: { url: true },
  custom: {
    custom: (value) => {
      if (value !== 'expected') return 'Valor inválido';
      return null;
    }
  },
});
```

---

## Mejores Prácticas

### 1. Validar Siempre en el Backend

```typescript
// ❌ MAL: Confiar solo en validación del frontend
export async function POST(request: Request) {
  const data = await request.json();
  // Sin validación - VULNERABLE
  await prisma.user.create({ data });
}

// ✅ BIEN: Validar siempre en backend
export async function POST(request: NextRequest) {
  const { data, error } = await validateUserRequest(request);
  if (error) return error;
  await prisma.user.create({ data });
}
```

### 2. Sanitizar Inputs del Usuario

```typescript
// ✅ BIEN: Sanitizar antes de guardar
import { sanitizeObject } from '@/lib/validation';

const cleanData = sanitizeObject(userInput);
await prisma.post.create({ data: cleanData });
```

### 3. Validar IDs de URL

```typescript
// ✅ BIEN: Validar ID antes de query
import { validateUUIDParam } from '@/lib/validation-middleware';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const validation = validateUUIDParam(params.id);
  if (!validation.isValid) {
    return createErrorResponse('ID inválido', 400);
  }
  
  const item = await prisma.item.findUnique({ where: { id: params.id } });
}
```

### 4. Rate Limiting en Endpoints Críticos

```typescript
// ✅ BIEN: Rate limit en login, registro, API calls
export async function POST(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const { allowed, error } = checkRateLimit(ip, 5, 60000); // 5/min
  if (!allowed) return error;
  
  // Proceso de login...
}
```

### 5. Mensajes de Error Informativos

```typescript
// ❌ MAL: Mensaje genérico
return NextResponse.json({ error: 'Error' }, { status: 400 });

// ✅ BIEN: Mensajes específicos
return NextResponse.json({
  error: 'Validation failed',
  details: [
    'El email es requerido',
    'La contraseña debe tener al menos 8 caracteres',
  ],
}, { status: 400 });
```

### 6. Validación de Fechas

```typescript
// ✅ BIEN: Validar rangos razonables
import { validateDateRange } from '@/lib/validation';

const validation = validateDateRange(startDate, endDate);
if (!validation.isValid) {
  return createErrorResponse(validation.errors.join('; '), 400);
}
```

### 7. Validación de Archivos

```typescript
// ✅ BIEN: Limitar tamaño y tipo
const validation = validateFileUpload(file, {
  maxSizeMB: 5,
  allowedTypes: ['application/pdf'],
  allowedExtensions: ['.pdf'],
});
```

### 8. Consistencia en Respuestas

```typescript
// ✅ BIEN: Formato consistente
return NextResponse.json({
  data: items,
  pagination: { page, limit, total, totalPages },
});

// Para errores
return NextResponse.json({
  error: 'Mensaje principal',
  details: ['Error 1', 'Error 2'],
}, { status: 400 });
```

---

## Checklist de Seguridad

- [x] Validación de todos los inputs del usuario
- [x] Sanitización contra XSS
- [x] Prevención de SQL Injection (Prisma ORM)
- [x] Validación de tipos de datos
- [x] Rate limiting en endpoints críticos
- [x] Validación de tamaño de archivos
- [x] Validación de tipos de archivos
- [x] HTTPS requerido para webhooks en producción
- [x] Contraseñas con requisitos de complejidad
- [x] Validación de permisos (RBAC)
- [x] Tokens de API con scopes limitados
- [x] Secrets de webhooks mínimo 32 caracteres
- [x] Validación de rangos de fechas
- [x] Validación de montos (límites razonables)

---

## Testing de Validaciones

### Casos de Prueba Recomendados

```typescript
// 1. Campos requeridos faltantes
test('should reject missing required fields', async () => {
  const result = validateInvoice({});
  expect(result.isValid).toBe(false);
  expect(result.errors).toContain('customerId es requerido');
});

// 2. Formatos inválidos
test('should reject invalid email', async () => {
  const result = validateCustomer({ email: 'invalid' });
  expect(result.isValid).toBe(false);
});

// 3. Rangos fuera de límites
test('should reject negative amounts', async () => {
  const result = validateExpense({ amount: -100 });
  expect(result.isValid).toBe(false);
});

// 4. XSS attempts
test('should sanitize XSS attempts', () => {
  const clean = sanitizeString('<script>alert(1)</script>');
  expect(clean).not.toContain('<script>');
});

// 5. Rate limiting
test('should block after max requests', () => {
  for (let i = 0; i < 100; i++) {
    checkRateLimit('user1', 100, 60000);
  }
  const { allowed } = checkRateLimit('user1', 100, 60000);
  expect(allowed).toBe(false);
});
```

---

## Métricas de Validación

| Métrica | Valor | Estado |
|---------|-------|--------|
| Validadores implementados | 15+ | ✅ |
| Tipos de datos validados | 10+ | ✅ |
| Rutas con validación | 8+ | ✅ |
| Sanitización XSS | Activa | ✅ |
| Rate limiting | Implementado | ✅ |
| Validación de archivos | Implementada | ✅ |
| Mensajes en español | 100% | ✅ |

---

## Próximos Pasos

1. **Tests Unitarios**: Crear suite completa de tests para todas las validaciones
2. **Tests de Integración**: Probar flujos completos con validación
3. **Logging**: Agregar logging de intentos de validación fallidos
4. **Monitoring**: Dashboard para visualizar validaciones fallidas
5. **Documentación de API**: OpenAPI/Swagger con validaciones documentadas

---

## Recursos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

---

**Sistema de Validación Completo - Implementado en FASE 10** ✅
