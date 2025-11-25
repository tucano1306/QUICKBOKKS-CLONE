# Plan de Migración Multi-Tenant

## Objetivo
Transformar la aplicación de modelo single-tenant a **multi-tenant** donde:
- Un **Contador/Accountant** gestiona múltiples empresas (clientes)
- Cada **Company** tiene datos completamente aislados
- El contador puede cambiar entre clientes fácilmente

## Cambios en el Schema (Prisma)

### Modelos que necesitan `companyId`:

#### ✅ Contabilidad
- [ ] `ChartAccount` - Plan de cuentas por empresa
- [ ] `JournalEntry` - Asientos por empresa
- [ ] `JournalLine` - Líneas de asiento

#### ✅ Gestión Financiera  
- [ ] `Invoice` - Facturas por empresa
- [ ] `InvoiceItem` - Items de factura
- [ ] `Customer` - Clientes de cada empresa
- [ ] `Product` - Productos/servicios por empresa
- [ ] `Expense` - Gastos por empresa
- [ ] `ExpenseCategory` - Categorías de gasto

#### ✅ Nómina
- [ ] `Employee` - Empleados por empresa
- [ ] `Payroll` - Nóminas por empresa
- [ ] `PayrollDeduction` - Deducciones

#### ✅ Banca
- [ ] `BankAccount` - Cuentas bancarias por empresa
- [ ] `Transaction` - Transacciones bancarias
- [ ] `Reconciliation` - Conciliaciones
- [ ] `ReconciliationItem` - Items de conciliación

#### ✅ Reportes y Presupuestos
- [ ] `TaxReturn` - Declaraciones fiscales
- [ ] `Budget` - Presupuestos por empresa
- [ ] `BudgetPeriod` - Períodos de presupuesto

#### ✅ Configuración
- [ ] `Currency` - Monedas usadas por empresa
- [ ] `CostCenter` - Centros de costo
- [ ] `FixedAsset` - Activos fijos
- [ ] `Depreciation` - Depreciaciones

## Cambios en la UI

### 1. Nuevo Layout con Selector de Empresa
```
┌─────────────────────────────────────┐
│ QuickBooks Clone                    │
│ ┌─────────────┐  Usuario: Juan     │
│ │ Empresa A ▼ │  [Notif] [Avatar]  │
│ └─────────────┘                     │
├─────────────────────────────────────┤
│ Sidebar con opciones de Empresa A   │
└─────────────────────────────────────┘
```

### 2. Dashboard de Contador (Nueva Página)
- `/accountant/dashboard` - Vista de todas las empresas
- Resumen de cada cliente
- Acceso rápido a cada empresa

### 3. Contexto Global de Empresa
- React Context para empresa activa
- Todos los endpoints filtran por `companyId`
- Middleware para validar acceso

## Pasos de Implementación

### Fase 1: Schema y Migración Base
1. Agregar `companyId` a todos los modelos principales
2. Crear migración de Prisma
3. Script para migrar datos existentes a una empresa "default"

### Fase 2: Backend (API)
1. Middleware para obtener `companyId` actual
2. Actualizar todos los endpoints para filtrar por `companyId`
3. Endpoints nuevos:
   - `GET /api/companies` - Listar empresas del contador
   - `POST /api/companies` - Crear nueva empresa
   - `PUT /api/companies/[id]` - Actualizar empresa
   - `GET /api/companies/[id]/switch` - Cambiar empresa activa

### Fase 3: Frontend
1. Context Provider para empresa activa
2. Selector de empresa en header
3. Dashboard del contador
4. Actualizar todas las páginas para usar `companyId`

### Fase 4: Permisos
1. Validar que usuario tiene acceso a empresa (CompanyUser)
2. Verificar rol (ACCOUNTANT, ADMIN, USER)
3. Permisos granulares por empresa

## Beneficios

✅ **Escalabilidad**: Un contador puede gestionar 100+ clientes
✅ **Aislamiento**: Datos completamente separados por empresa
✅ **Seguridad**: No hay risk de mezclar datos entre clientes
✅ **Flexibilidad**: Cada empresa puede tener su configuración
✅ **Reportes**: Comparar métricas entre clientes

## Timeline Estimado

- **Fase 1**: 2-3 horas (Schema + Migración)
- **Fase 2**: 4-5 horas (Backend APIs)
- **Fase 3**: 3-4 horas (Frontend UI)
- **Fase 4**: 2-3 horas (Permisos)

**Total**: ~12-15 horas de desarrollo

---

¿Procedemos con la implementación?
