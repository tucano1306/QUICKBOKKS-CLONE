# Form 1040 - U.S. Individual Income Tax Return

## Descripción General

El Form 1040 es el formulario principal utilizado por los contribuyentes individuales de Estados Unidos para presentar su declaración anual de impuestos sobre la renta. Este módulo proporciona una interfaz completa para:

- Completar el Form 1040 con todos sus campos requeridos
- Auto-poblar datos desde la información de la empresa
- Calcular automáticamente impuestos, deducciones y créditos
- Obtener sugerencias de optimización fiscal con IA
- Generar resúmenes detallados del formulario

## Características Principales

### 1. Auto-Población de Datos
El sistema puede llenar automáticamente el formulario usando:
- Datos de W-2 almacenados en el sistema
- Ingresos de negocio (Schedule C) desde facturas
- Gastos de negocio desde transacciones
- Intereses y dividendos de transacciones bancarias
- Retenciones federales de formularios W-2

### 2. Cálculo Automático
El sistema calcula automáticamente:
- **Ingreso Total (Line 9)**: Suma de todos los tipos de ingresos
- **Ingreso Bruto Ajustado - AGI (Line 11)**: Ingreso total menos ajustes
- **Deducción Estándar (Line 12)**: Según estado civil y edad
- **Ingreso Gravable (Line 15)**: AGI menos deducciones
- **Impuesto (Line 16)**: Calculado según tablas de impuestos 2024
- **Impuesto de Auto-Empleo**: Si tiene Schedule C
- **Créditos**: Child Tax Credit, Other Dependent Credit
- **Reembolso o Cantidad Adeudada**: Basado en retenciones vs impuesto total

### 3. Soporte para Schedule C
Para trabajadores independientes y dueños de negocios:
- Ingresos brutos del negocio
- Gastos de negocio deducibles
- Cálculo de ganancia neta
- Impuesto de auto-empleo (15.3%)
- Deducción de la mitad del impuesto de auto-empleo

### 4. Sugerencias de IA
El sistema proporciona recomendaciones inteligentes para:
- Maximizar deducciones
- Contribuciones a cuentas de retiro (SEP-IRA, Solo 401k)
- Deducción de seguro de salud para trabajadores independientes
- Deducción de oficina en casa
- Pagos estimados trimestrales
- Child Tax Credit y otros créditos

## Estados de Presentación (Filing Status)

### SINGLE (Soltero)
- Deducción estándar 2024: $14,600
- Adicional 65+/ciego: $1,950

### MARRIED_FILING_JOINTLY (Casado declarando en conjunto)
- Deducción estándar 2024: $29,200
- Adicional 65+/ciego: $1,550 por persona

### MARRIED_FILING_SEPARATELY (Casado declarando por separado)
- Deducción estándar 2024: $14,600
- Adicional 65+/ciego: $1,550

### HEAD_OF_HOUSEHOLD (Jefe de familia)
- Deducción estándar 2024: $21,900
- Adicional 65+/ciego: $1,950

### QUALIFYING_SURVIVING_SPOUSE (Cónyuge sobreviviente calificado)
- Deducción estándar 2024: $29,200
- Adicional 65+/ciego: $1,550

## Tablas de Impuestos 2024

### Single / Soltero
| Ingreso Gravable | Tasa |
|------------------|------|
| $0 - $11,600 | 10% |
| $11,600 - $47,150 | 12% |
| $47,150 - $100,525 | 22% |
| $100,525 - $191,950 | 24% |
| $191,950 - $243,725 | 32% |
| $243,725 - $609,350 | 35% |
| Más de $609,350 | 37% |

### Married Filing Jointly / Casado en Conjunto
| Ingreso Gravable | Tasa |
|------------------|------|
| $0 - $23,200 | 10% |
| $23,200 - $94,300 | 12% |
| $94,300 - $201,050 | 22% |
| $201,050 - $383,900 | 24% |
| $383,900 - $487,450 | 32% |
| $487,450 - $731,200 | 35% |
| Más de $731,200 | 37% |

### Head of Household / Jefe de Familia
| Ingreso Gravable | Tasa |
|------------------|------|
| $0 - $16,550 | 10% |
| $16,550 - $63,100 | 12% |
| $63,100 - $100,500 | 22% |
| $100,500 - $191,950 | 24% |
| $191,950 - $243,700 | 32% |
| $243,700 - $609,350 | 35% |
| Más de $609,350 | 37% |

## Líneas Principales del Form 1040

### INCOME (Ingresos)
- **Line 1a**: Wages, salaries, tips (W-2)
- **Line 2b**: Taxable interest
- **Line 3a**: Qualified dividends
- **Line 3b**: Ordinary dividends
- **Line 4a**: IRA distributions
- **Line 4b**: Taxable IRA
- **Line 5a**: Pensions and annuities
- **Line 5b**: Taxable pensions
- **Line 6a**: Social security benefits
- **Line 6b**: Taxable social security
- **Line 7**: Capital gain or (loss)
- **Line 8**: Other income (including Schedule C)
- **Line 9**: Total income

### ADJUSTMENTS (Ajustes)
- **Line 10**: Adjustments to income
  - Deductible part of self-employment tax
  - Self-employed health insurance
  - IRA deduction
  - Student loan interest
  - Educator expenses

### AGI & DEDUCTIONS
- **Line 11**: Adjusted Gross Income (AGI)
- **Line 12**: Standard deduction or itemized
- **Line 15**: Taxable income

### TAX & CREDITS
- **Line 16**: Tax (from tax tables)
- **Line 17**: Additional taxes (Schedule 2)
  - Self-employment tax
  - Additional Medicare tax
- **Line 18**: Total tax
- **Line 19**: Child tax credit and credit for other dependents
- **Line 24**: Total tax after credits

### PAYMENTS
- **Line 25a**: Federal income tax withheld (W-2)
- **Line 26**: Estimated tax payments
- **Line 27**: Earned Income Credit (EIC)
- **Line 32**: Total payments

### REFUND OR AMOUNT OWED
- **Line 33**: Overpayment
- **Line 34a**: Amount you want refunded
- **Line 36**: Amount you owe

## Schedule C - Profit or Loss From Business

Para trabajadores independientes (freelancers, consultores, dueños de negocios):

### Ingresos
- Gross receipts or sales (Ventas brutas)
- Returns and allowances (Devoluciones)
- Other income (Otros ingresos)

### Gastos Deducibles
- Advertising
- Car and truck expenses
- Commissions and fees
- Contract labor
- Depreciation
- Insurance
- Legal and professional services
- Office expense
- Rent or lease
- Repairs and maintenance
- Supplies
- Utilities
- Wages
- Travel
- Meals (50% deducible)

### Cálculo
```
Net Profit = Gross Receipts - Total Expenses
```

### Impuesto de Auto-Empleo
Si Net Profit > $400:
```
Self-Employment Income = Net Profit × 92.35%
Self-Employment Tax = Self-Employment Income × 15.3%
Deductible Portion = Self-Employment Tax ÷ 2
```

## Child Tax Credit

### Requisitos
- El niño debe ser menor de 17 años al final del año fiscal
- El niño debe ser su hijo, hija, hijastro, hijo adoptivo, hermano, hermana o descendiente de cualquiera de estos
- El niño debe tener un SSN válido
- El niño debe haber vivido con usted más de la mitad del año
- El niño no puede haber proporcionado más de la mitad de su propio sustento

### Montos
- **$2,000** por niño calificado menor de 17 años
- **$500** por otros dependientes (Credit for Other Dependents)

### Límites de Ingresos (Phase-out)
El crédito se reduce si AGI excede:
- $400,000 para casados declarando en conjunto
- $200,000 para todos los demás estados de presentación

## Uso del Sistema

### 1. Crear/Editar Form 1040
1. Navegar a **Impuestos → Form 1040 (Individual)**
2. Seleccionar el año fiscal
3. Completar la información personal
4. Ingresar ingresos, deducciones y dependientes
5. Hacer clic en **Guardar Formulario**

### 2. Auto-Llenar desde Empresa
1. Asegurarse de tener una empresa activa seleccionada
2. Hacer clic en **Auto-Llenar desde Empresa**
3. El sistema cargará:
   - Salarios W-2
   - Ingresos de negocio (Schedule C)
   - Gastos de negocio
   - Retenciones federales

### 3. Obtener Sugerencias de IA
1. Guardar el formulario primero
2. Hacer clic en **Sugerencias de IA**
3. Revisar recomendaciones personalizadas

### 4. Ver Resumen
1. Guardar el formulario primero
2. Hacer clic en **Ver Resumen**
3. Revisar el resumen completo formateado

## API Endpoints

### GET /api/tax-forms/1040
Obtiene el Form 1040 existente o información para crear uno nuevo

**Query Parameters:**
- `year` (required): Año fiscal (e.g., 2024)
- `companyId` (optional): ID de la empresa
- `action` (optional): `auto-populate`, `ai-suggestions`, `summary`

**Response:**
```json
{
  "id": "cm123...",
  "taxYear": 2024,
  "filingStatus": "SINGLE",
  "line1a_w2Wages": 75000,
  "line11_adjustedGrossIncome": 70000,
  "line34a_refundAmount": 2500,
  ...
}
```

### POST /api/tax-forms/1040
Crea o actualiza el Form 1040

**Request Body:**
```json
{
  "taxYear": 2024,
  "companyId": "cm123...",
  "filingStatus": "SINGLE",
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "ssn": "123-45-6789",
    "homeAddress": "123 Main St",
    "city": "Miami",
    "state": "FL",
    "zipCode": "33101"
  },
  "income": {
    "wages": 75000,
    "taxableInterest": 500,
    ...
  },
  "scheduleC": {
    "grossReceipts": 50000,
    "expenses": 15000
  },
  "dependents": [
    {
      "firstName": "Jane",
      "lastName": "Doe",
      "ssn": "987-65-4321",
      "relationship": "Daughter",
      "childTaxCredit": true
    }
  ]
}
```

**Response:**
```json
{
  "message": "Form 1040 guardado correctamente",
  "form1040": { ... },
  "aiSuggestions": [
    {
      "type": "retirement",
      "title": "Contribución SEP-IRA",
      "description": "...",
      "potentialSavings": 6000
    }
  ]
}
```

### DELETE /api/tax-forms/1040
Elimina el Form 1040 de un año específico

**Query Parameters:**
- `year` (required): Año fiscal a eliminar

## Consejos y Mejores Prácticas

### 1. Mantener Registros
- Guarde todos los W-2 y 1099
- Mantenga recibos de gastos deducibles
- Documente ingresos de negocio
- Conserve registros por al menos 3 años

### 2. Aprovechar Deducciones
- Contribuir a cuentas de retiro (IRA, SEP-IRA, 401k)
- Deducir seguro de salud si es trabajador independiente
- Reclamar deducción de oficina en casa si califica
- Deducir millas de negocio (2024: $0.67/milla)

### 3. Créditos vs Deducciones
- **Créditos**: Reducen el impuesto dólar por dólar
- **Deducciones**: Reducen el ingreso gravable
- Child Tax Credit vale más que una deducción equivalente

### 4. Pagos Estimados
Si debe más de $1,000:
- Hacer pagos estimados trimestrales
- Evitar multas por pago insuficiente (3-5%)
- Fechas: 15 de abril, 15 de junio, 15 de septiembre, 15 de enero

### 5. Extensiones
- Puede solicitar extensión hasta el 15 de octubre
- Extensión NO extiende el plazo para pagar impuestos
- Pague lo que estime deber antes del 15 de abril

## Soporte Técnico

### Base de Datos
El formulario se almacena en la tabla `TaxForm1040` con los siguientes campos principales:
- Información personal (nombre, SSN, dirección)
- Estado civil (filingStatus)
- Todos los campos del Form 1040 (line1a, line2b, etc.)
- Schedule C (si aplica)
- Dependientes (JSON)
- Timestamps y status

### Servicios
- `form-1040-service.ts`: Lógica de negocio y cálculos
- `api/tax-forms/1040/route.ts`: API endpoints
- `page.tsx`: Interfaz de usuario

### Cálculos
- Tax brackets: Tablas de impuestos 2024
- Standard deduction: Según filing status y edad
- Self-employment tax: 15.3% sobre 92.35% de net profit
- Child tax credit: $2,000 por niño calificado

## Recursos Adicionales

### IRS Resources
- [Form 1040 Instructions](https://www.irs.gov/forms-pubs/about-form-1040)
- [Schedule C Instructions](https://www.irs.gov/forms-pubs/about-schedule-c-form-1040)
- [Tax Brackets 2024](https://www.irs.gov/newsroom/irs-provides-tax-inflation-adjustments-for-tax-year-2024)
- [Child Tax Credit](https://www.irs.gov/credits-deductions/individuals/child-tax-credit)

### Fechas Importantes 2025 (para año fiscal 2024)
- **15 de enero**: Pago estimado Q4 2024
- **31 de enero**: Fecha límite para enviar W-2 y 1099
- **15 de abril**: Fecha límite para presentar Form 1040
- **15 de octubre**: Fecha límite con extensión

---

**Última actualización**: Enero 2026  
**Versión**: 1.0  
**Año fiscal soportado**: 2024
