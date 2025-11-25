# 🤖 AGENTE IA AUTÓNOMO - GUÍA COMPLETA

## 📋 Descripción

Sistema de **Agente IA Autónomo** que puede ejecutar acciones reales en la aplicación mediante comandos en lenguaje natural. El agente entiende instrucciones en español y ejecuta tareas como crear facturas, registrar gastos, generar reportes y más.

---

## ✨ Características Principales

### 🎯 Capacidades del Agente

1. **Crear Facturas**
   - Genera facturas para clientes
   - Calcula impuestos automáticamente
   - Establece fechas de vencimiento
   - Busca o crea clientes automáticamente

2. **Registrar Gastos**
   - Registra gastos con categorización automática
   - Asocia gastos a proveedores
   - Usa ML para categorizar

3. **Gestionar Clientes**
   - Crea nuevos clientes
   - Actualiza información
   - Busca clientes existentes

4. **Generar Reportes**
   - Balance General
   - Estado de Resultados
   - Flujo de Efectivo
   - Resumen de Impuestos
   - Ventas por Cliente

5. **Análisis Financiero**
   - Analiza patrones de gastos
   - Encuentra oportunidades de ahorro
   - Detecta anomalías
   - Genera recomendaciones

6. **Búsqueda Inteligente**
   - Busca transacciones por criterios múltiples
   - Filtra por monto, fecha, cliente
   - Búsqueda en lenguaje natural

---

## 🚀 Configuración

### 1. Variables de Entorno

Crea o actualiza tu archivo `.env`:

```env
# Proveedor de IA (openai, llama, mixtral)
AI_PROVIDER=openai

# OpenAI (Recomendado - Más potente)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Llama 3 Local (Opcional - Privacidad total)
LLAMA_ENDPOINT=http://localhost:8000

# Mixtral Local (Opcional - Alternativa open source)
MIXTRAL_ENDPOINT=http://localhost:8001
```

### 2. Instalar Dependencias

```bash
npm install openai
npm install react-markdown
```

### 3. Opción A: Usar OpenAI GPT-4 (Recomendado)

**Ventajas:**
- ✅ Más potente y preciso
- ✅ Mejor comprensión de contexto
- ✅ Function calling nativo
- ✅ No requiere infraestructura local

**Configuración:**

1. Obtén tu API key en: https://platform.openai.com/api-keys
2. Agrégala a `.env`:
   ```env
   AI_PROVIDER=openai
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
   ```

**Costos:** ~$0.01 por conversación promedio

### 4. Opción B: Usar Llama 3 Local (Privacidad)

**Ventajas:**
- ✅ Sin costos de API
- ✅ Datos nunca salen de tu servidor
- ✅ Privacidad completa
- ✅ Sin límites de uso

**Configuración:**

#### Usando Ollama (Más fácil):

```bash
# Instalar Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Descargar Llama 3
ollama pull llama3

# Iniciar servidor (puerto 8000)
ollama serve
```

#### Usando llama.cpp:

```bash
# Clonar repositorio
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp

# Compilar
make

# Descargar modelo
huggingface-cli download TheBloke/Llama-2-13B-chat-GGUF llama-2-13b-chat.Q4_K_M.gguf

# Iniciar servidor
./server -m models/llama-2-13b-chat.Q4_K_M.gguf --port 8000
```

**Configurar .env:**
```env
AI_PROVIDER=llama
LLAMA_ENDPOINT=http://localhost:8000
```

### 5. Opción C: Usar Mixtral Local

**Ventajas:**
- ✅ Open source
- ✅ Excelente razonamiento
- ✅ Multilingüe nativo

**Configuración:**

```bash
# Usando Ollama
ollama pull mixtral

# O usando llama.cpp
# Descargar modelo Mixtral-8x7B
huggingface-cli download TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF

# Iniciar servidor en puerto 8001
./server -m models/mixtral-8x7b-instruct-v0.1.Q4_K_M.gguf --port 8001
```

**Configurar .env:**
```env
AI_PROVIDER=mixtral
MIXTRAL_ENDPOINT=http://localhost:8001
```

---

## 💬 Ejemplos de Uso

### Crear Facturas

```
Usuario: "Crea una factura para el cliente ABC Corp por $5,000"
```

El agente:
1. Busca o crea el cliente "ABC Corp"
2. Crea la factura con el monto especificado
3. Calcula impuestos automáticamente
4. Retorna el ID de la factura creada

```
Usuario: "Genera una factura de $2,500 para John Doe con vencimiento en 15 días"
```

El agente:
1. Busca el cliente "John Doe"
2. Crea factura con fecha de vencimiento específica
3. Calcula totales con impuestos

### Registrar Gastos

```
Usuario: "Registra un gasto de $250 en suministros de oficina"
```

```
Usuario: "Anota que gasté $1,200 en marketing digital en Facebook Ads"
```

El agente categoriza automáticamente usando ML.

### Generar Reportes

```
Usuario: "Muéstrame el estado de resultados de este trimestre"
```

```
Usuario: "Dame el balance general al día de hoy"
```

```
Usuario: "¿Cuál fue mi flujo de efectivo del mes pasado?"
```

### Análisis Financiero

```
Usuario: "Analiza mis gastos de los últimos 3 meses"
```

El agente:
- Agrupa gastos por categoría
- Identifica categorías más costosas
- Sugiere oportunidades de ahorro

```
Usuario: "¿Cuál es mi resumen financiero de este mes?"
```

Retorna:
- Ingresos totales
- Gastos totales
- Utilidad neta
- Cuentas por cobrar
- Número de transacciones

### Búsqueda

```
Usuario: "Busca todas las facturas mayores a $1,000 del último mes"
```

```
Usuario: "Muéstrame los gastos en viajes"
```

```
Usuario: "Encuentra transacciones del cliente XYZ"
```

### Gestión de Clientes

```
Usuario: "Crea un cliente llamado Tech Solutions Inc con email info@techsolutions.com"
```

```
Usuario: "Agrega un nuevo cliente: María García, email maria@example.com, teléfono 555-1234"
```

---

## 🏗️ Arquitectura Técnica

### Componentes

```
src/lib/ai-agent-service.ts       # Servicio principal del agente
src/app/api/ai-agent/chat/route.ts # API endpoint
src/app/ai-agent/page.tsx          # UI de chat
```

### Flujo de Datos

```
Usuario escribe mensaje
    ↓
UI envía a /api/ai-agent/chat
    ↓
API crea/obtiene conversación
    ↓
ai-agent-service.ts procesa con IA
    ↓
IA detecta intención (function calling)
    ↓
Ejecuta función correspondiente
    ↓
Retorna resultado al usuario
    ↓
UI muestra respuesta + acciones ejecutadas
```

### Funciones Disponibles

El agente tiene acceso a estas funciones:

1. **create_invoice** - Crear facturas
2. **create_expense** - Registrar gastos
3. **create_customer** - Crear clientes
4. **generate_report** - Generar reportes
5. **search_transactions** - Buscar transacciones
6. **get_financial_summary** - Resumen financiero
7. **analyze_expenses** - Análisis de gastos
8. **categorize_expense** - Categorización con ML

---

## 🎨 Interfaz de Usuario

### Características del Chat

- ✅ **Diseño moderno** con gradientes y glassmorphism
- ✅ **Streaming en tiempo real** (opcional con GPT-4)
- ✅ **Historial persistente** guardado en DB
- ✅ **Sugerencias contextuales** después de cada respuesta
- ✅ **Indicadores de acciones** ejecutadas
- ✅ **Markdown rendering** para respuestas formateadas
- ✅ **Tema oscuro/claro** automático
- ✅ **Animaciones suaves** con Tailwind

### Acceso

Navega a: `http://localhost:3000/ai-agent`

---

## 🔧 Personalización

### Modificar el System Prompt

Edita `src/lib/ai-agent-service.ts`:

```typescript
const SYSTEM_PROMPT = `
Tu personalización aquí...
- Cambiar el tono (formal/informal)
- Agregar reglas específicas
- Definir comportamientos personalizados
`;
```

### Agregar Nuevas Funciones

1. **Define la función** en `AGENT_FUNCTIONS`:

```typescript
{
  name: 'mi_nueva_funcion',
  description: 'Descripción de lo que hace',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: '...' },
      param2: { type: 'number', description: '...' },
    },
    required: ['param1'],
  },
}
```

2. **Implementa la función**:

```typescript
async function miNuevaFuncion(params: any, userId: string): Promise<any> {
  // Tu lógica aquí
  return {
    success: true,
    data: resultado,
  };
}
```

3. **Agrégala al switch** en `executeFunction`:

```typescript
case 'mi_nueva_funcion':
  return await miNuevaFuncion(args, userId);
```

---

## 📊 Monitoreo y Logs

Todas las conversaciones se guardan en la base de datos:

```sql
-- Ver conversaciones
SELECT * FROM chat_conversations ORDER BY "lastMessageAt" DESC;

-- Ver mensajes de una conversación
SELECT * FROM chat_messages WHERE "conversationId" = 'xxx' ORDER BY "createdAt";
```

---

## 🔒 Seguridad

### Validaciones Implementadas

- ✅ **Autenticación requerida** - Solo usuarios autenticados
- ✅ **Aislamiento por usuario** - Cada usuario ve solo sus datos
- ✅ **Confirmación de acciones** - Acciones destructivas requieren confirmación
- ✅ **Rate limiting** - Previene abuso (configurar en middleware)
- ✅ **Sanitización de inputs** - Previene inyección SQL

### Mejores Prácticas

1. **No exponer API keys** en el frontend
2. **Usar variables de entorno** para configuración sensible
3. **Implementar rate limiting** en producción
4. **Monitorear uso de API** (si usas OpenAI)
5. **Logs de auditoría** para acciones críticas

---

## 💰 Costos (OpenAI)

### Estimaciones con GPT-4 Turbo

- **Conversación simple:** ~$0.005
- **Conversación con function calling:** ~$0.01
- **Análisis complejo:** ~$0.02

**Promedio mensual** (100 conversaciones): ~$1.00

### Ahorrar Costos

1. Usar **GPT-3.5-turbo** (10x más barato):
   ```typescript
   model: 'gpt-3.5-turbo'
   ```

2. Usar **Llama 3 local** (gratis):
   ```env
   AI_PROVIDER=llama
   ```

3. **Cachear respuestas** comunes
4. **Limitar historial** a últimos 10 mensajes

---

## 🚀 Despliegue en Producción

### 1. Configurar Variables de Entorno

```bash
# Vercel/Netlify
vercel env add OPENAI_API_KEY
vercel env add AI_PROVIDER
```

### 2. Optimizaciones

```typescript
// Habilitar streaming (OpenAI)
stream: true

// Reducir max_tokens para respuestas más cortas
max_tokens: 500

// Usar modelo más económico
model: 'gpt-3.5-turbo'
```

### 3. Rate Limiting

Implementar en middleware:

```typescript
// src/middleware.ts
export function middleware(req: NextRequest) {
  const ip = req.ip || 'unknown';
  // Implementar lógica de rate limit
}
```

---

## 🐛 Troubleshooting

### Error: "OpenAI no está configurado"

**Solución:** Agrega `OPENAI_API_KEY` a `.env`

### Error: "Llama API error"

**Solución:** Verifica que Ollama está corriendo:
```bash
ollama serve
curl http://localhost:8000/v1/models
```

### El agente no ejecuta acciones

**Solución:** 
1. Verifica que usas OpenAI GPT-4 (mejor function calling)
2. Revisa logs de `executeFunction`
3. Asegúrate de que las funciones están bien definidas

### Conversación no persiste

**Solución:**
1. Verifica que la tabla `chat_conversations` existe
2. Revisa permisos de base de datos
3. Checa logs de `saveConversation`

---

## 📚 Recursos Adicionales

### OpenAI
- Documentación: https://platform.openai.com/docs
- Function calling: https://platform.openai.com/docs/guides/function-calling
- Pricing: https://openai.com/pricing

### Llama
- Ollama: https://ollama.com
- llama.cpp: https://github.com/ggerganov/llama.cpp
- Modelos: https://huggingface.co/TheBloke

### Mixtral
- Documentación: https://mistral.ai/technology/
- Modelos: https://huggingface.co/mistralai

---

## 🎯 Roadmap Futuro

- [ ] **Streaming responses** en tiempo real
- [ ] **Voice input** con Web Speech API
- [ ] **Proactive notifications** - Agente avisa problemas automáticamente
- [ ] **Multi-agent system** - Múltiples agentes especializados
- [ ] **Fine-tuning** con datos específicos del usuario
- [ ] **Vision support** - Analizar imágenes de recibos
- [ ] **Export conversations** a PDF
- [ ] **Collaborative chat** - Múltiples usuarios en la conversación

---

## 📞 Soporte

¿Preguntas? Abre un issue en GitHub o contacta al equipo de desarrollo.

---

**¡Tu agente IA está listo! Pruébalo en `/ai-agent` 🚀**
