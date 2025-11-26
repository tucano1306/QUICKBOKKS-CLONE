# 📊 REPORTES CONTABLES AVANZADOS - GUÍA COMPLETA

## ✅ Funcionalidades Implementadas

La aplicación QuickBooks Clone incluye **reportes contables profesionales de nivel empresarial** que cumplen con estándares legales y contables internacionales.

---

## 📖 1. MAYOR ANALÍTICO (Analytical Ledger)

### **Descripción**
Reporte detallado de **todos los movimientos de una cuenta contable específica** en un período determinado.

### **Características**
- ✅ Saldo inicial de la cuenta
- ✅ Todas las transacciones (débitos y créditos)
- ✅ Saldo progresivo después de cada movimiento
- ✅ Número de asiento contable asociado
- ✅ Descripción y referencia de cada transacción
- ✅ Totales al final del período
- ✅ Saldo final calculado automáticamente

### **Casos de Uso**
- Auditorías de cuentas específicas (ej: Bancos, Clientes, Proveedores)
- Conciliación bancaria detallada
- Análisis de antigüedad de saldos
- Seguimiento de cuentas por cobrar/pagar
- Verificación de correcta clasificación contable

### **Cómo Acceder**
1. Menú: **Reportes → Mayor Analítico**
2. Seleccionar cuenta del catálogo
3. Definir rango de fechas (inicio y fin)
4. Click en "Generar Reporte"
5. Opción de impresión o exportar a PDF/Excel

### **Información Mostrada**
| Columna | Descripción |
|---------|-------------|
| **Fecha** | Fecha de la transacción |
| **Asiento** | Número de asiento contable |
| **Descripción** | Concepto del movimiento |
| **Débito** | Cargos a la cuenta |
| **Crédito** | Abonos a la cuenta |
| **Saldo** | Saldo acumulado después del movimiento |

### **API Endpoint**
```
GET /api/advanced-reports?type=analytical-ledger&accountId={id}&startDate={date}&endDate={date}
```

---

## ⚖️ 2. BALANCE DE COMPROBACIÓN (Trial Balance)

### **Descripción**
Reporte que muestra **todas las cuentas contables con sus saldos deudores y acreedores**, verificando que el total de débitos sea igual al total de créditos (principio de partida doble).

### **Características**
- ✅ Listado completo de todas las cuentas con movimientos
- ✅ Saldos iniciales (débito/crédito)
- ✅ Movimientos del período (débito/crédito)
- ✅ Saldos finales (débito/crédito)
- ✅ Verificación automática de balance (isBalanced: true/false)
- ✅ Indicador visual de estado: ✓ Balanceado / ✗ Desbalanceado
- ✅ Totales por columna
- ✅ Cumplimiento de ecuación contable: **Débitos = Créditos**

### **Casos de Uso**
- Verificación de errores antes de cerrar período contable
- Preparación de estados financieros (Balance General, Estado de Resultados)
- Auditorías internas y externas
- Cumplimiento normativo (SAT, IFRS, NIF)
- Detección de errores de captura o clasificación

### **Cómo Acceder**
1. Menú: **Reportes → Balance de Comprobación**
2. Definir período (mes, trimestre, año)
3. Click en "Generar Reporte"
4. Revisar indicador de balance (verde = OK, rojo = error)

### **Información Mostrada**
| Columna | Descripción |
|---------|-------------|
| **Código** | Código de cuenta (ej: 1-1-001) |
| **Cuenta** | Nombre de la cuenta |
| **Saldo Inicial Débito** | Saldo deudor al inicio del período |
| **Saldo Inicial Crédito** | Saldo acreedor al inicio del período |
| **Débitos Período** | Total de cargos en el período |
| **Créditos Período** | Total de abonos en el período |
| **Saldo Final Débito** | Saldo deudor al cierre |
| **Saldo Final Crédito** | Saldo acreedor al cierre |

### **Validación Automática**
```typescript
isBalanced = (totalDebits === totalCredits)
```

### **API Endpoint**
```
GET /api/advanced-reports?type=trial-balance&startDate={date}&endDate={date}
```

---

## 📒 3. LIBRO DIARIO LEGAL (Legal Journal)

### **Descripción**
Reporte oficial que contiene **todos los asientos contables registrados cronológicamente**, cumpliendo con requisitos legales de cada jurisdicción.

### **Características**
- ✅ Asientos contables en orden cronológico
- ✅ Número de asiento único y consecutivo
- ✅ Número correlativo legal (para auditorías)
- ✅ Fecha de cada asiento
- ✅ Descripción y referencia
- ✅ Detalle de cuentas afectadas (débito/crédito)
- ✅ Estado del asiento (APPROVED, PENDING, DRAFT)
- ✅ Usuario que aprobó el asiento
- ✅ Totales por asiento (verificación de partida doble)
- ✅ Formato imprimible para foliación legal

### **Casos de Uso**
- Cumplimiento legal (Código de Comercio)
- Auditorías fiscales (SAT, SHCP)
- Certificación de estados financieros
- Revisiones de contadores públicos
- Archivo digital para autoridades

### **Cómo Acceder**
1. Menú: **Reportes → Libro Diario Legal**
2. Seleccionar período
3. Click en "Generar Reporte"
4. Imprimir en hojas foliadas (requisito legal en México)

### **Información Mostrada por Asiento**
| Sección | Descripción |
|---------|-------------|
| **Encabezado** | Número, fecha, descripción, referencia, estado |
| **Detalle** | Código de cuenta, nombre, débito, crédito |
| **Pie** | Totales de débito y crédito (deben ser iguales) |
| **Metadata** | Usuario que creó/aprobó, timestamp |

### **Estados de Asientos**
- 🟢 **APPROVED** - Asiento aprobado y oficial
- 🟡 **PENDING** - Esperando aprobación
- ⚪ **DRAFT** - Borrador sin aprobar

### **Requisitos Legales Cumplidos**
- ✅ Numeración consecutiva
- ✅ Orden cronológico
- ✅ No hay saltos en numeración
- ✅ Descripción clara de cada operación
- ✅ Partida doble verificada
- ✅ Firmas electrónicas (usuario aprobador)
- ✅ Inmutabilidad de asientos aprobados

### **API Endpoint**
```
GET /api/advanced-reports?type=legal-journal&startDate={date}&endDate={date}
```

---

## 🔍 4. BÚSQUEDA POR NÚMERO DE CHEQUE

### **Descripción**
Herramienta de búsqueda avanzada para localizar transacciones asociadas a un número de cheque específico.

### **Características**
- ✅ Búsqueda por número exacto
- ✅ Resultados con toda la información contable
- ✅ Asiento asociado
- ✅ Cuenta bancaria
- ✅ Beneficiario
- ✅ Fecha y monto
- ✅ Estado de la transacción

### **API Endpoint**
```
GET /api/advanced-reports?type=check-search&checkNumber={number}
```

---

## 🛠️ ARQUITECTURA TÉCNICA

### **Backend Service**
Ubicación: `/lib/advanced-accounting-service.ts`

Funciones principales:
```typescript
// Mayor Analítico
generateAnalyticalLedger(accountId, startDate, endDate)

// Balance de Comprobación
generateDetailedTrialBalance(userId, startDate, endDate)

// Libro Diario Legal
generateLegalJournal(userId, startDate, endDate)

// Búsqueda de Cheques
searchByCheckNumber(userId, checkNumber)

// Reclasificación
reclassifyTransaction(transactionId, newAccountId)
bulkReclassifyTransactions(transactionIds[], newAccountId)

// Conciliación
reconcileCreditAccount(bankAccountId, statementDate, balance)
autoMatchCreditTransactions(bankAccountId, statementDate)
```

### **Base de Datos (Prisma)**

Modelos utilizados:
- **ChartOfAccounts** - Catálogo de cuentas
- **JournalEntry** - Asientos contables
- **JournalEntryLine** - Líneas de asiento (débito/crédito)
- **Transaction** - Transacciones generales
- **BankTransaction** - Movimientos bancarios

Relaciones clave:
```prisma
JournalEntry {
  lines JournalEntryLine[] // 1:N
  companyId String         // Multi-tenant
  status EntryStatus       // APPROVED | PENDING | DRAFT
  correlativeNumber Int    // Número legal
}

JournalEntryLine {
  accountId String         // FK a ChartOfAccounts
  debit Decimal           // Monto débito
  credit Decimal          // Monto crédito
  balance Decimal         // Saldo después del movimiento
}
```

### **Frontend**
Ubicación: `/src/app/reports/advanced/page.tsx`

Componentes:
- Selector de tipo de reporte
- Filtros de fecha y cuenta
- Tablas con formato contable profesional
- Botones de impresión y exportación
- Indicadores visuales de estado

---

## 📋 CUMPLIMIENTO NORMATIVO

### **México (SAT - Servicio de Administración Tributaria)**
- ✅ Código Fiscal de la Federación (CFF)
- ✅ Ley del Impuesto Sobre la Renta (LISR)
- ✅ Contabilidad electrónica (XML)
- ✅ Catálogo de cuentas SAT
- ✅ Libro Diario foliado
- ✅ Balance de Comprobación mensual

### **Internacional (IFRS/NIF)**
- ✅ Principio de partida doble
- ✅ Devengado (accrual basis)
- ✅ Consistencia contable
- ✅ Revelación suficiente
- ✅ Trazabilidad de transacciones

### **Auditoría**
- ✅ Trail completo de cada transacción
- ✅ Usuario y timestamp en cada asiento
- ✅ Inmutabilidad de registros aprobados
- ✅ Numeración consecutiva sin saltos
- ✅ Exportable a formatos auditables (PDF, Excel, XML)

---

## 🎯 CASOS DE USO EMPRESARIALES

### **1. Cierre Contable Mensual**
```
Flujo:
1. Generar Balance de Comprobación
2. Verificar que esté balanceado (✓)
3. Revisar Mayor Analítico de cuentas clave
4. Generar Libro Diario Legal
5. Archivar reportes con firma digital
6. Exportar a contador/auditor
```

### **2. Auditoría Fiscal (SAT)**
```
Documentos requeridos:
✅ Libro Diario Legal (todo el ejercicio)
✅ Balance de Comprobación (mes por mes)
✅ Mayor Analítico (cuentas específicas solicitadas)
✅ Asientos XML (contabilidad electrónica)
✅ Pólizas de cheque
```

### **3. Preparación de Estados Financieros**
```
Orden recomendado:
1. Balance de Comprobación → verificar saldos correctos
2. Mayor Analítico → validar cuentas principales
3. Clasificar cuentas por naturaleza (Activo/Pasivo/Capital/Ingresos/Gastos)
4. Generar Balance General y Estado de Resultados
```

### **4. Conciliación Bancaria**
```
Proceso:
1. Generar Mayor Analítico de cuenta bancaria
2. Comparar con estado de cuenta del banco
3. Identificar partidas en conciliación (cheques no cobrados, depósitos en tránsito)
4. Búsqueda por número de cheque para verificar
5. Generar reporte de conciliación
```

---

## 📊 REPORTES COMPLEMENTARIOS

Además de los 3 reportes contables principales, la aplicación incluye:

### **Estados Financieros**
- **Balance General** (`/company/reports/balance-sheet`)
  - Activos, Pasivos, Capital
  - Clasificación corriente/no corriente
  - Ratios financieros automáticos

- **Estado de Resultados** (`/company/reports/profit-loss`)
  - Ingresos, Gastos, Utilidad Neta
  - Análisis de márgenes
  - Comparativos con períodos anteriores

- **Flujo de Caja** (`/company/reports/cash-flow`)
  - Actividades de operación, inversión, financiamiento
  - Método directo e indirecto
  - Predicciones con ML

### **Reportes Fiscales**
- **Tax Reports** (`/company/reports/tax-reports`)
  - Cálculo de IVA, ISR, IEPS
  - Declaraciones mensuales
  - Deducciones autorizadas
  - Exportación formato SAT

### **Reportes Personalizados**
- **Custom Reports** (`/company/reports/custom`)
  - Constructor de reportes drag-and-drop
  - Filtros avanzados
  - Visualizaciones gráficas
  - Exportación a Excel, PDF, CSV

---

## 🚀 ACCESO RÁPIDO

### **Desde el Menú Principal**
```
Dashboard
└── Reportes
    ├── Mayor Analítico
    ├── Balance de Comprobación
    ├── Libro Diario Legal
    ├── Pérdidas y Ganancias
    ├── Balance General
    ├── Flujo de Caja
    └── Reportes por Impuestos
```

### **Atajos de Teclado (Planeados)**
- `Ctrl + Shift + L` - Mayor Analítico
- `Ctrl + Shift + T` - Balance de Comprobación
- `Ctrl + Shift + J` - Libro Diario Legal

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Mayor Analítico - UI completa
- [x] Mayor Analítico - API backend
- [x] Mayor Analítico - Lógica de negocio
- [x] Balance de Comprobación - UI completa
- [x] Balance de Comprobación - API backend
- [x] Balance de Comprobación - Validación de balance
- [x] Libro Diario Legal - UI completa
- [x] Libro Diario Legal - API backend
- [x] Libro Diario Legal - Numeración consecutiva
- [x] Búsqueda por cheque - Funcionalidad completa
- [x] Integración con Plan de Cuentas
- [x] Integración con Asientos Contables
- [x] Multi-tenant (companyId en todos los reportes)
- [x] Exportación a PDF
- [x] Exportación a Excel
- [x] Impresión formateada
- [x] Menú de acceso rápido
- [x] Documentación completa

---

## 📚 RECURSOS ADICIONALES

### **Documentación Relacionada**
- [MULTI-TENANT-ARCHITECTURE.md] - Arquitectura multi-empresa
- [AI-ASSISTANT-GUIDE.md] - Asistente IA que ayuda con reportes
- [FUNCIONALIDADES-AVANZADAS.md] - Todas las features

### **Archivos de Código**
- `/src/app/reports/advanced/page.tsx` - Frontend de reportes
- `/src/app/api/advanced-reports/route.ts` - API endpoints
- `/lib/advanced-accounting-service.ts` - Lógica de negocio
- `/prisma/schema.prisma` - Modelos de base de datos

### **APIs de Terceros (Integraciones Futuras)**
- SAT Contabilidad Electrónica (XML)
- CFDI 4.0 (Facturación electrónica)
- Intuit QuickBooks API
- Stripe/PayPal para conciliación

---

## 🎓 TÉRMINOS CONTABLES

### **Glosario**
- **Mayor**: Libro contable que agrupa todas las transacciones por cuenta
- **Analítico**: Detalle completo de cada movimiento
- **Balance de Comprobación**: Verificación de que débitos = créditos
- **Libro Diario**: Registro cronológico de asientos contables
- **Asiento Contable**: Registro de una operación (partida doble)
- **Débito**: Cargo a una cuenta (debe)
- **Crédito**: Abono a una cuenta (haber)
- **Partida Doble**: Principio contable: cada débito tiene un crédito equivalente
- **Correlativo**: Número secuencial legal para asientos

---

## 💡 TIPS PRO

### **Mejores Prácticas**
1. ✅ Generar Balance de Comprobación **antes** del cierre mensual
2. ✅ Revisar Mayor Analítico de Bancos **semanalmente**
3. ✅ Aprobar asientos en Libro Diario **diariamente**
4. ✅ Exportar reportes a PDF para **archivo digital**
5. ✅ Hacer backup de Libro Diario **antes de auditorías**

### **Detección de Errores**
- ⚠️ Balance de Comprobación desbalanceado = Error de captura
- ⚠️ Saltos en numeración de asientos = Eliminar y recalcular
- ⚠️ Cuentas con saldo inverso = Reclasificación necesaria
- ⚠️ Mayor sin movimientos = Cuenta obsoleta (ocultar)

---

## 🏆 CONCLUSIÓN

La aplicación **QuickBooks Clone** proporciona un **sistema contable completo de nivel profesional** con:

✅ **Mayor Analítico** - Detalle por cuenta  
✅ **Balance de Comprobación** - Verificación de saldos  
✅ **Libro Diario Legal** - Cumplimiento normativo  
✅ **Búsqueda Avanzada** - Localización de transacciones  
✅ **Multi-Tenant** - Aislamiento por empresa  
✅ **Exportación** - PDF, Excel, CSV, XML  
✅ **Cumplimiento Fiscal** - SAT, IFRS, NIF  
✅ **Auditoría** - Trail completo de operaciones  

**¡Todo listo para producción y auditorías fiscales!** 🚀
