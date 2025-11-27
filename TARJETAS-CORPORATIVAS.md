# Módulo de Tarjetas Corporativas - Documentación Completa

## 📋 Resumen General

El módulo de **Tarjetas Corporativas** permite gestionar tarjetas de empresa, sincronizar transacciones, conciliarlas con gastos registrados y automatizar la categorización mediante reglas inteligentes.

---

## 🗂️ Estructura de Archivos

### **Base de Datos (Prisma Schema)**

**Archivo:** `prisma/schema.prisma`

#### Modelos creados:

1. **CorporateCard**
   - Información de tarjetas corporativas
   - Campos: cardNumber, lastFourDigits, cardHolderName, cardType, creditLimit, currentBalance, status, etc.
   - Enums: `CorporateCardType` (CREDIT, DEBIT, PREPAID), `CorporateCardStatus` (ACTIVE, INACTIVE, SUSPENDED, EXPIRED, CANCELLED)

2. **CorporateCardTransaction**
   - Transacciones de tarjetas
   - Campos: merchantName, amount, transactionDate, status, isReconciled, expenseId (vincula con Expense)
   - Enum: `CardTransactionStatus` (PENDING, POSTED, DECLINED, CANCELLED, REFUNDED)

3. **CorporateCardRule**
   - Reglas de clasificación automática
   - Campos: merchantPattern (regex), amountMin/Max, categoryId, autoReconcile, requireReceipt, priority
   - Permite automatizar la categorización basándose en patrones

---

## 📄 Páginas del Módulo

### 1. **Página Principal de Tarjetas**
**Ruta:** `/company/expenses/corporate-cards`  
**Archivo:** `src/app/company/expenses/corporate-cards/page.tsx`

#### Funcionalidades:
- ✅ Lista de todas las tarjetas corporativas
- ✅ Estadísticas globales:
  - Total de tarjetas activas
  - Límite de crédito total
  - Balance usado
  - Porcentaje de utilización
- ✅ Sincronización con bancos (simulado)
- ✅ Búsqueda y filtros
- ✅ Selección de tarjeta para ver detalles
- ✅ Barra de progreso de utilización por tarjeta
- ✅ Badges de estado (ACTIVE/INACTIVE/SUSPENDED/EXPIRED/CANCELLED)
- ✅ Colores distintivos por marca (Visa, Mastercard, Amex)

#### Acciones disponibles:
- Sincronizar tarjetas
- Ver movimientos
- Conciliar gastos
- Configurar reglas

---

### 2. **Transacciones de Tarjetas**
**Ruta:** `/company/expenses/corporate-cards/transactions`  
**Archivo:** `src/app/company/expenses/corporate-cards/transactions/page.tsx`

#### Funcionalidades:
- ✅ Lista completa de transacciones (todas las tarjetas o filtrada por una)
- ✅ Estadísticas:
  - Total de movimientos
  - Monto total
  - Transacciones conciliadas
  - Transacciones pendientes
- ✅ Filtros avanzados:
  - Búsqueda por comercio/descripción
  - Filtro por estado (PENDING/POSTED/DECLINED/CANCELLED)
  - Filtro por estado de conciliación (conciliados/pendientes)
- ✅ Tabla detallada con:
  - Fecha, tarjeta, comercio, descripción
  - Categoría asignada
  - Monto, estado, estado de conciliación
- ✅ Acciones inline:
  - Conciliar con gasto existente
  - Asignar categoría
- ✅ Exportación a CSV

#### Navegación:
- Recibe parámetro `?cardId=` para filtrar por tarjeta específica
- Navega a reconcile/assign según acción seleccionada

---

### 3. **Conciliación de Transacciones**
**Ruta:** `/company/expenses/corporate-cards/reconcile`  
**Archivo:** `src/app/company/expenses/corporate-cards/reconcile/page.tsx`

#### Funcionalidades:
- ✅ Vista dividida en 2 columnas:
  - **Izquierda:** Transacciones pendientes de conciliar
  - **Derecha:** Gastos registrados disponibles
- ✅ Coincidencias automáticas con IA:
  - Algoritmo de matching por monto + fecha (± 3 días)
  - Score de confianza (0-100%)
  - Badges de sugerencia con icono ✨ para matches > 90%
- ✅ Selección manual:
  - Click en transacción (borde azul)
  - Click en gasto (borde verde)
  - Confirmar vinculación
- ✅ Conciliación automática masiva:
  - Botón para conciliar todas las coincidencias > 90% de confianza
  - Feedback visual y notificaciones
- ✅ Búsqueda de gastos en tiempo real
- ✅ Estadísticas:
  - Transacciones pendientes
  - Coincidencias automáticas disponibles

#### Navegación:
- Recibe parámetro `?transactionId=` para preseleccionar una transacción
- Vuelve a `/transactions` después de conciliar

---

### 4. **Asignación de Categorías**
**Ruta:** `/company/expenses/corporate-cards/assign`  
**Archivo:** `src/app/company/expenses/corporate-cards/assign/page.tsx`

#### Funcionalidades:
- ✅ Detalles completos de la transacción:
  - Comercio, categoría del comercio
  - Monto (destacado en grande)
  - Fecha formateada
  - Descripción
- ✅ Sugerencia inteligente:
  - Basada en el nombre del comercio
  - Basada en palabras clave en la descripción
  - Badge de confianza (%)
  - Explicación del por qué de la sugerencia
  - Botón "Usar sugerencia" para aplicar rápidamente
- ✅ Selector de categorías:
  - Grid visual con tarjetas por categoría
  - Colores distintivos por categoría
  - Estadística de uso (cuántas veces se ha usado)
  - Búsqueda en tiempo real
  - Selección con feedback visual (cambio de color + icono ✓)
- ✅ Campo de notas opcional
- ✅ Confirmación visual de categoría seleccionada
- ✅ Botón de guardar con loading state

#### Navegación:
- Recibe parámetro `?transactionId=` para cargar transacción específica
- Vuelve a `/transactions` después de guardar

---

### 5. **Configuración de Reglas**
**Ruta:** `/company/expenses/corporate-cards/rules`  
**Archivo:** `src/app/company/expenses/corporate-cards/rules/page.tsx`

#### Funcionalidades:
- ✅ Lista de reglas configuradas con:
  - Prioridad (orden de aplicación)
  - Nombre y descripción
  - Patrón de comercio (regex)
  - Rango de montos (opcional)
  - Categoría asignada
  - Estado (activa/inactiva)
  - Opciones: auto-conciliar, requerir recibo, notificar
  - Estadística de coincidencias históricas
- ✅ Estadísticas globales:
  - Total de reglas
  - Reglas activas
  - Total de coincidencias
- ✅ Crear/Editar reglas:
  - Formulario completo con validaciones
  - Campo para patrón regex con explicación
  - Campos de monto mínimo/máximo opcionales
  - Selector de categoría
  - Checkboxes para opciones:
    - Auto-conciliar (crea el gasto automáticamente)
    - Requerir recibo (marca como pendiente hasta recibir recibo)
    - Notificar en coincidencia (envía notificación)
  - Botón "Probar" para simular contra datos históricos
- ✅ Gestión de reglas:
  - Cambiar prioridad (flechas ↑↓)
  - Activar/Desactivar (toggle rápido)
  - Editar (abre formulario con datos)
  - Eliminar (con confirmación)
- ✅ Ordenamiento por prioridad:
  - Las reglas se aplican de arriba hacia abajo
  - Primera coincidencia gana
  - Drag visual mediante botones de prioridad

#### Patrones de Ejemplo:
```regex
^(uber|didi)          → Empieza con "uber" o "didi"
amazon                → Contiene "amazon"
(google|microsoft)    → Contiene "google" o "microsoft"
^restaurant           → Empieza con "restaurant"
```

---

## 🔄 Flujo de Trabajo Completo

### **Flujo típico de uso:**

1. **Sincronizar Tarjetas**
   - Usuario hace clic en "Sincronizar tarjetas"
   - Sistema conecta con API bancaria (mock: simulación de 2 segundos)
   - Descarga nuevas transacciones
   - Toast de confirmación

2. **Ver Movimientos**
   - Usuario navega a `/transactions`
   - Ve lista de todas las transacciones
   - Filtra por estado o tarjeta específica
   - Identifica transacciones sin conciliar (badge amarillo)

3. **Opción A: Conciliación Manual**
   - Click en botón "Conciliar" en una transacción
   - Navega a `/reconcile?transactionId=123`
   - Sistema muestra transacción seleccionada (borde azul)
   - Sistema sugiere gastos similares (badge morado con %)
   - Usuario selecciona gasto correcto (borde verde)
   - Confirma conciliación
   - Vuelve a `/transactions`

4. **Opción B: Conciliación Automática**
   - Usuario hace clic en "Conciliar Automático" en `/reconcile`
   - Sistema encuentra todas las coincidencias > 90%
   - Vincula automáticamente en masa
   - Toast muestra "X transacciones conciliadas"
   - Actualiza listas en tiempo real

5. **Asignar Categoría**
   - Click en botón "Asignar categoría" en transacción
   - Navega a `/assign?transactionId=123`
   - Sistema muestra sugerencia inteligente
   - Usuario acepta sugerencia o elige manualmente
   - Agrega notas si es necesario
   - Guarda categoría
   - Vuelve a `/transactions`

6. **Configurar Reglas (Automatización)**
   - Usuario navega a `/rules`
   - Crea nueva regla:
     - Nombre: "Uber - Transporte"
     - Patrón: `^(uber|didi)`
     - Categoría: Transporte
     - Auto-conciliar: ✓
   - Prueba la regla (muestra cuántas transacciones históricas coincidirían)
   - Guarda regla
   - **De ahora en adelante:** Todas las transacciones de Uber/Didi se clasifican automáticamente

---

## 🎨 Diseño y UX

### **Paleta de Colores:**
- **Indigo** (principal): Tarjetas, botones primarios, bordes destacados
- **Verde**: Conciliaciones exitosas, estado activo
- **Amarillo**: Pendientes, alertas
- **Morado**: Sugerencias de IA, coincidencias automáticas
- **Azul**: Información, selección de transacción
- **Rojo**: Errores, estado declinado, eliminar
- **Gris**: Inactivo, deshabilitado

### **Componentes Reutilizados:**
- `DashboardLayout` - Layout principal con sidebar
- `Card`, `CardHeader`, `CardTitle`, `CardContent` - Contenedores
- `Button` - Botones con variantes
- `Badge` - Etiquetas de estado
- `Input` - Campos de texto
- `Table` - Tablas de datos
- `ActionButtonsGroup` - Grupo de botones de acción (usado en página de gastos)

### **Iconos (lucide-react):**
- `CreditCard` - Tarjetas
- `Wallet` - Billetera
- `LinkIcon` - Conciliación
- `Tag` - Categorías
- `Settings` - Configuración
- `Sparkles` - IA/Sugerencias
- `CheckCircle` - Éxito/Activo
- `XCircle` - Error/Inactivo
- `AlertCircle` - Advertencia/Pendiente
- `ArrowRightLeft` - Intercambio
- `RefreshCw` - Sincronizar
- `Download` - Exportar
- `Plus` - Crear nuevo
- `Edit` - Editar
- `Trash2` - Eliminar
- `ArrowUp/Down` - Prioridad

---

## 🔌 Integraciones Pendientes

### **APIs Bancarias (Próxima fase):**
1. **Plaid** (USA/Canada)
2. **Belvo** (LATAM)
3. **Stripe Issuing** (tarjetas virtuales)
4. **Bancos directos** (API propietarias)

### **Endpoints API Necesarios:**

```typescript
// Tarjetas
GET    /api/corporate-cards              → Lista todas las tarjetas
POST   /api/corporate-cards/sync         → Sincroniza con banco
GET    /api/corporate-cards/[id]         → Detalle de tarjeta
PATCH  /api/corporate-cards/[id]         → Actualiza tarjeta

// Transacciones
GET    /api/corporate-cards/transactions              → Lista transacciones
GET    /api/corporate-cards/[id]/transactions         → Transacciones de una tarjeta
POST   /api/corporate-cards/transactions/reconcile    → Vincula con gasto
PATCH  /api/corporate-cards/transactions/[id]         → Actualiza transacción
POST   /api/corporate-cards/transactions/bulk-assign  → Asigna categoría masiva

// Reglas
GET    /api/corporate-cards/rules        → Lista reglas
POST   /api/corporate-cards/rules        → Crea regla
PATCH  /api/corporate-cards/rules/[id]   → Actualiza regla
DELETE /api/corporate-cards/rules/[id]   → Elimina regla
POST   /api/corporate-cards/rules/test   → Prueba regla
POST   /api/corporate-cards/rules/apply  → Aplica reglas a transacciones
```

---

## 📊 Datos Mock Incluidos

### **Tarjetas de ejemplo:**
1. Juan Pérez - Visa \*\*\*\* 4532 - $50,000 límite
2. María González - Mastercard \*\*\*\* 8765 - $75,000 límite
3. Pedro Martínez - Amex \*\*\*\* 2468 - $100,000 límite

### **Transacciones de ejemplo:**
- Amazon México - $2,499 - Equipo de oficina
- Uber - $350 - Viaje al aeropuerto
- LinkedIn - $299 - Suscripción Premium
- Restaurant El Fogón - $1,250 - Comida con cliente
- Google Workspace - $720 - Plan Business

### **Categorías de ejemplo:**
- Oficina y Suministros
- Tecnología
- Transporte
- Comidas y Entretenimiento
- Marketing
- Software y Suscripciones
- Servicios Profesionales
- Capacitación

### **Reglas de ejemplo:**
1. Uber/Didi → Transporte (auto-conciliar)
2. Amazon < $5,000 → Oficina (requiere recibo)
3. Google/Microsoft → Software (auto-conciliar)
4. Restaurantes → Comidas (requiere recibo, notificar)

---

## ✅ Estado Actual

### **Completado:**
- ✅ Schema de base de datos (3 modelos, 4 enums)
- ✅ Página principal de tarjetas con estadísticas
- ✅ Página de transacciones con filtros y exportación
- ✅ Página de conciliación con matching inteligente
- ✅ Página de asignación de categorías con sugerencias
- ✅ Página de configuración de reglas con CRUD completo
- ✅ Integración con página de gastos (5 botones de acción)
- ✅ Navegación completa entre todas las páginas
- ✅ Mock data funcional en todas las páginas
- ✅ 0 errores de compilación

### **Pendiente para producción:**
- ⏳ Migración de Prisma (`npx prisma migrate dev`)
- ⏳ Implementación de endpoints API
- ⏳ Integración con APIs bancarias reales
- ⏳ Sistema de notificaciones
- ⏳ Webhooks para transacciones en tiempo real
- ⏳ Tests unitarios e integración
- ⏳ Manejo de transacciones duplicadas
- ⏳ Soporte multi-moneda
- ⏳ Gestión de tarjetas virtuales
- ⏳ Dashboard de analytics de gastos por tarjeta
- ⏳ Alertas de límite de crédito
- ⏳ Aprobaciones de gastos

---

## 🚀 Próximos Pasos Recomendados

1. **Migrar base de datos:**
   ```bash
   npx prisma migrate dev --name add_corporate_cards
   npx prisma generate
   ```

2. **Crear API endpoints** (usar los ejemplos de código arriba)

3. **Integrar con Plaid/Belvo** para sincronización real

4. **Implementar sistema de notificaciones** (email/Slack/webhook)

5. **Agregar tests:**
   ```bash
   npm install -D @testing-library/react @testing-library/jest-dom
   ```

6. **Documentar APIs** con Swagger/OpenAPI

7. **Configurar CI/CD** para deployment automático

---

## 📞 Soporte

Para dudas o mejoras, contacta al equipo de desarrollo.

**Módulo creado:** Enero 2024  
**Última actualización:** Enero 2024  
**Versión:** 1.0.0
