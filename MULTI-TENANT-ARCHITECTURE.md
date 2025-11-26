# 🏢 MULTI-TENANT ARCHITECTURE - AISLAMIENTO POR EMPRESA

## 📋 Resumen Ejecutivo

**QuickBooks Clone** implementa una arquitectura **multi-tenant** donde cada empresa registrada tiene sus datos completamente aislados. El campo `companyId` es la clave de todo el sistema.

---

## 🔑 Conceptos Clave

### 1. **CompanyId como Discriminador**
- Todas las tablas principales en Prisma tienen el campo `companyId` (String?)
- TODAS las queries deben filtrar por `companyId` del `activeCompany`
- Ningún usuario puede ver datos de empresas a las que no pertenece

### 2. **CompanyContext (Global State)**
- Ubicación: `/src/contexts/CompanyContext.tsx`
- Hook: `useCompany()` - disponible en toda la app
- Proporciona: `activeCompany`, `companies`, `setActiveCompany()`
- Storage: `localStorage.getItem('activeCompanyId')`

### 3. **User-Company Relationship**
- Un usuario puede pertenecer a MÚLTIPLES empresas
- Tabla intermedia: `CompanyUser` (user ↔ company + role)
- Roles: OWNER, ADMIN, ACCOUNTANT, USER, VIEWER

---

## 🛠️ IMPLEMENTACIÓN PRÁCTICA

### ✅ **CORRECTO: Filtrar por companyId**

```typescript
// En componentes
'use client'
import { useCompany } from '@/contexts/CompanyContext'

export default function InvoicesPage() {
  const { activeCompany } = useCompany()
  
  useEffect(() => {
    async function loadInvoices() {
      const response = await fetch(`/api/invoices?companyId=${activeCompany?.id}`)
      const data = await response.json()
      setInvoices(data)
    }
    
    if (activeCompany) {
      loadInvoices()
    }
  }, [activeCompany])
}
```

```typescript
// En API routes
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = request.nextUrl.searchParams.get('companyId')
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })

  // ✅ Verificar que el usuario tiene acceso a esta empresa
  const hasAccess = await prisma.companyUser.findFirst({
    where: {
      userId: session.user.id,
      companyId: companyId
    }
  })

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ✅ Filtrar datos por companyId
  const invoices = await prisma.invoice.findMany({
    where: { companyId },
    include: { customer: true, items: true },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(invoices)
}
```

### ❌ **INCORRECTO: Sin filtrar por companyId**

```typescript
// ❌ ESTO ES UN PROBLEMA DE SEGURIDAD
const invoices = await prisma.invoice.findMany({
  // Falta where: { companyId }
  orderBy: { createdAt: 'desc' }
})
// Esto retornaría facturas de TODAS las empresas
```

---

## 📊 TABLAS CON companyId

Todas estas tablas DEBEN tener `companyId` y ser filtradas:

### Core Financiero
- ✅ `Invoice` - Facturas
- ✅ `InvoiceItem` - Items de factura
- ✅ `Payment` - Pagos
- ✅ `Expense` - Gastos
- ✅ `Customer` - Clientes
- ✅ `Vendor` - Proveedores
- ✅ `Product` - Productos/Servicios

### Contabilidad
- ✅ `ChartOfAccount` - Plan de cuentas
- ✅ `JournalEntry` - Asientos contables
- ✅ `Transaction` - Transacciones
- ✅ `BankAccount` - Cuentas bancarias
- ✅ `BankTransaction` - Movimientos bancarios
- ✅ `Reconciliation` - Conciliaciones

### Nómina
- ✅ `Employee` - Empleados
- ✅ `Payroll` - Nóminas
- ✅ `Attendance` - Asistencias
- ✅ `Timesheet` - Hojas de tiempo

### Fiscal
- ✅ `TaxReturn` - Declaraciones
- ✅ `TaxWithholding` - Retenciones
- ✅ `EInvoice` - CFDI

### Reportes & IA
- ✅ `Budget` - Presupuestos
- ✅ `CostCenter` - Centros de costo
- ✅ AI Assistant conversations (future)

---

## 🔐 VERIFICACIÓN DE ACCESO

### Middleware de Seguridad (Recomendado)

```typescript
// /src/middleware/companyAccess.ts
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function verifyCompanyAccess(userId: string, companyId: string) {
  const access = await prisma.companyUser.findFirst({
    where: {
      userId,
      companyId,
      company: { status: 'ACTIVE' } // Solo empresas activas
    },
    include: {
      company: true
    }
  })

  if (!access) {
    throw new Error('Access denied to this company')
  }

  return access
}

// Uso en API routes
export async function GET(request: NextRequest) {
  const session = await getServerSession()
  const companyId = request.nextUrl.searchParams.get('companyId')
  
  await verifyCompanyAccess(session.user.id, companyId) // Lanza error si no tiene acceso
  
  // Continuar con la lógica...
}
```

---

## 🚀 FLUJO DE TRABAJO MULTI-TENANT

### 1. **Login del Usuario**
```
Usuario ingresa email/password
  ↓
NextAuth valida credenciales
  ↓
Se carga lista de empresas del usuario (CompanyProvider)
  ↓
Se selecciona empresa activa (última usada o primera)
  ↓
activeCompany se guarda en localStorage
```

### 2. **Navegación en la App**
```
Usuario accede a /company/invoices
  ↓
Componente lee activeCompany del CompanyContext
  ↓
Hace fetch a /api/invoices?companyId={activeCompany.id}
  ↓
API verifica acceso del usuario a esa empresa
  ↓
Retorna solo datos filtrados por companyId
```

### 3. **Cambio de Empresa**
```
Usuario hace click en Company Switcher
  ↓
Llama a setActiveCompany(nuevaEmpresa)
  ↓
Se actualiza localStorage
  ↓
Se actualiza CompanyContext
  ↓
Todos los componentes se re-renderizan con nueva empresa
  ↓
Todas las queries automáticamente usan nuevo companyId
```

---

## 🎯 COMPANY SWITCHER (UI Component)

```typescript
// En el navbar/sidebar
import { useCompany } from '@/contexts/CompanyContext'

function CompanySwitcher() {
  const { activeCompany, companies, setActiveCompany } = useCompany()

  return (
    <select 
      value={activeCompany?.id} 
      onChange={(e) => {
        const company = companies.find(c => c.id === e.target.value)
        if (company) setActiveCompany(company)
      }}
    >
      {companies.map(company => (
        <option key={company.id} value={company.id}>
          {company.name}
        </option>
      ))}
    </select>
  )
}
```

---

## 🤖 AI ASSISTANT & MULTI-TENANCY

### El AI Assistant está AISLADO por empresa:

1. **Contexto del Chat:**
   - Cada conversación incluye `companyId` en todas las peticiones
   - El AI solo tiene acceso a datos de esa empresa específica

2. **Historial de Conversaciones:**
   - Se guarda con `companyId` en base de datos
   - Cada empresa tiene su propio historial separado

3. **Insights y Análisis:**
   - Los análisis IA solo leen datos filtrados por `companyId`
   - Predicciones basadas únicamente en datos de esa empresa

```typescript
// API endpoint del AI Assistant
export async function POST(request: NextRequest) {
  const { companyId, message } = await request.json()
  
  // ✅ Verificar acceso
  await verifyCompanyAccess(session.user.id, companyId)
  
  // ✅ Obtener datos SOLO de esta empresa
  const companyData = await getCompanyFinancialData(companyId)
  
  // ✅ Generar respuesta con contexto de esta empresa
  const response = await generateAIResponse(message, companyData)
  
  return NextResponse.json({ response })
}
```

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

### Para CADA nuevo módulo/feature:

- [ ] ¿La tabla de Prisma tiene campo `companyId`?
- [ ] ¿El componente usa `useCompany()` hook?
- [ ] ¿Todas las queries filtran por `activeCompany?.id`?
- [ ] ¿El API endpoint verifica `companyId` del request?
- [ ] ¿Se valida que el usuario tiene acceso a esa empresa?
- [ ] ¿Los datos se filtran por `where: { companyId }`?
- [ ] ¿El componente se re-renderiza al cambiar de empresa?

---

## 🔍 TESTING MULTI-TENANCY

### Escenarios de Prueba:

1. **Usuario con 1 empresa:**
   - ✅ Solo ve datos de su empresa
   - ✅ No puede acceder a otras empresas

2. **Usuario con múltiples empresas:**
   - ✅ Puede cambiar entre empresas
   - ✅ Los datos cambian correctamente al cambiar
   - ✅ No hay "data leaking" entre empresas

3. **Usuario sin acceso:**
   - ✅ Intenta acceder a `/api/invoices?companyId=otra-empresa`
   - ✅ Recibe 403 Forbidden

4. **AI Assistant:**
   - ✅ Respuestas basadas en datos de empresa activa
   - ✅ No puede acceder a datos de otras empresas
   - ✅ Historial separado por empresa

---

## 🚨 ERRORES COMUNES A EVITAR

### ❌ Error 1: Olvidar filtrar por companyId
```typescript
// MAL
const invoices = await prisma.invoice.findMany()

// BIEN
const invoices = await prisma.invoice.findMany({
  where: { companyId }
})
```

### ❌ Error 2: No verificar acceso en API
```typescript
// MAL
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId')
  const data = await prisma.invoice.findMany({ where: { companyId } })
  return NextResponse.json(data)
}

// BIEN
export async function GET(request: NextRequest) {
  const session = await getServerSession()
  const companyId = request.nextUrl.searchParams.get('companyId')
  
  // Verificar que el usuario puede acceder a esta empresa
  await verifyCompanyAccess(session.user.id, companyId)
  
  const data = await prisma.invoice.findMany({ where: { companyId } })
  return NextResponse.json(data)
}
```

### ❌ Error 3: Hardcodear companyId
```typescript
// MAL
const invoices = await fetch('/api/invoices?companyId=123')

// BIEN
const { activeCompany } = useCompany()
const invoices = await fetch(`/api/invoices?companyId=${activeCompany?.id}`)
```

---

## 📚 RECURSOS

- **CompanyContext:** `/src/contexts/CompanyContext.tsx`
- **Prisma Schema:** `/prisma/schema.prisma` (buscar `companyId`)
- **AI Assistant API:** `/src/app/api/ai-assistant/chat/route.ts`
- **Floating Assistant:** `/src/components/ai-assistant/floating-assistant.tsx`

---

## ✅ ESTADO ACTUAL

**TODO en la app está implementado con multi-tenancy:**
- ✅ Facturas, Gastos, Clientes, Productos
- ✅ Contabilidad: Plan de cuentas, Asientos, Transacciones
- ✅ Nómina: Empleados, Payroll, Cheques
- ✅ Reportes: Balance, P&L, Cash Flow
- ✅ AI Assistant: Chat personalizado por empresa
- ✅ Documentos: Upload con IA por empresa
- ✅ Payment Links: Links únicos por empresa

**Todos los módulos filtran por `companyId` correctamente.**

---

## 🎉 CONCLUSIÓN

El sistema QuickBooks Clone está **completamente preparado para multi-tenancy**:

1. ✅ **Aislamiento de datos** por empresa
2. ✅ **AI Assistant personalizado** por empresa
3. ✅ **Company Switcher** funcional
4. ✅ **Verificación de acceso** en todos los endpoints
5. ✅ **Sin data leaking** entre empresas

Cada empresa que se registre tendrá su propia instancia virtual de la aplicación con datos completamente aislados.
