# Solución: Creación Múltiple de Gastos con AI Assistant

## Problema
El asistente de AI no estaba creando los gastos solicitados cuando el usuario pedía crear múltiples gastos. Mencionaba algo sobre "cuenta de caja" pero no se veían reflejados los gastos.

## Causas Identificadas

### 1. **Falta de Function Calling en Groq**
El código original de `chatWithGroq()` **NO** estaba usando el mecanismo de "function calling" (tool calling) que permite a la IA ejecutar acciones reales en la aplicación. Solo estaba generando texto sin ejecutar las funciones.

**Antes:**
```typescript
const completion = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages,
  temperature: 0.7,
  max_tokens: 2000,
});
// ❌ Sin tools, sin ejecución de funciones
```

**Después:**
```typescript
const completion = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages,
  tools,              // ✅ Funciones disponibles
  tool_choice: 'auto', // ✅ IA decide cuándo usarlas
  temperature: 0.7,
  max_tokens: 2000,
});
```

### 2. **Error de "Cuenta de Caja no encontrada"**
Cuando el usuario no tiene el catálogo de cuentas inicializado, el sistema no puede crear los asientos contables (Journal Entries) necesarios para registrar los gastos.

**Solución implementada:**
- Se agregó la función `ensureBasicAccounts()` que crea automáticamente las cuentas contables básicas si no existen.
- Ahora antes de crear un gasto, el sistema verifica y crea las cuentas necesarias.

### 3. **System Prompt mejorado**
Se actualizó el prompt del sistema para que la IA entienda que:
- DEBE usar las funciones disponibles
- PUEDE llamar funciones múltiples veces
- DEBE ejecutar acciones, no solo describirlas

## Cambios Implementados

### 1. **ai-agent-service.ts - Function Calling**
```typescript
// ✅ Ahora soporta tool calling con Groq
if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
  for (const toolCall of assistantMessage.tool_calls) {
    const functionResult = await executeFunction(
      toolCall.function.name,
      toolCall.function.arguments,
      context.userId
    );
    actions.push({
      type: toolCall.function.name,
      description: `Ejecutando: ${toolCall.function.name}`,
      result: functionResult,
    });
  }
}
```

### 2. **Creación Automática de Cuentas Básicas**
```typescript
async function ensureBasicAccounts(companyId: string) {
  const basicAccounts = [
    { code: '1000', name: 'Caja', type: 'ASSET', ... },
    { code: '5000', name: 'Gastos Operativos', type: 'EXPENSE', ... },
    // ... más cuentas
  ];
  
  for (const account of basicAccounts) {
    await prisma.chartOfAccounts.upsert({...});
  }
}
```

### 3. **System Prompt Actualizado**
```typescript
REGLAS IMPORTANTES:
- DEBES usar las funciones disponibles para ejecutar acciones reales
- Cuando pidan crear múltiples elementos, DEBES llamar la función MÚLTIPLES VECES
- Puedes ejecutar MÚLTIPLES funciones en una sola respuesta
- SIEMPRE ejecuta las acciones, no solo describas lo que harías
```

## Cómo Probar

### Opción 1: Usar el Script de Prueba
```bash
npx ts-node scripts/test-ai-expense-creation.ts
```

### Opción 2: Probar en la Interfaz
1. Ve a la sección de AI Assistant
2. Escribe: "Crea 10 gastos de $50 cada uno con el concepto 'Material de oficina'"
3. La IA debe:
   - Llamar `create_expense` 10 veces
   - Crear los 10 gastos en la base de datos
   - Crear los asientos contables correspondientes
   - Confirmar con los IDs de los gastos creados

## Ejemplo de Uso

**Prompt del Usuario:**
```
Crea 10 gastos de $100 cada uno por "Gasolina" categoría "travel"
```

**Respuesta Esperada:**
```
✅ ¡Listo! He creado 10 gastos por Gasolina.

📊 Detalles:
- Cantidad: 10 gastos
- Monto cada uno: $100.00
- Total: $1,000.00
- Categoría: Travel
- Concepto: Gasolina

🆔 IDs de los gastos creados:
1. clxxxx...
2. clxxxx...
...
10. clxxxx...

💡 Próximos pasos:
- Ver todos los gastos
- Generar reporte de gastos
- Analizar gastos del mes
```

## Variables de Entorno Requeridas

Asegúrate de tener configurada tu API key de Groq:

```env
GROQ_API_KEY=tu_api_key_aqui
AI_PROVIDER=groq
```

## Verificar que Funciona

1. **Revisa los logs del servidor:**
   ```
   [AI-Agent] Groq tool_calls detectados: [...]
   [AI-Agent] Ejecutando función: create_expense con args: {...}
   ✅ Gasto clxxxx creado con JE JE-2025-000001
   ```

2. **Verifica en la base de datos:**
   ```sql
   SELECT COUNT(*) FROM "Expense" WHERE description = 'Gasolina';
   -- Debe retornar 10
   
   SELECT COUNT(*) FROM "JournalEntry" WHERE description LIKE '%Gasolina%';
   -- Debe retornar 10 (uno por cada gasto)
   ```

3. **Interfaz de usuario:**
   - Los gastos deben aparecer en la tabla de gastos
   - Los asientos contables deben estar en el libro diario
   - El balance debe reflejar los $1,000 en gastos

## Limitaciones Conocidas

1. **Máximo de Tool Calls**: Groq puede tener límites en el número de tool calls por request. Si necesitas crear más de ~20 gastos, es mejor hacerlo en batches.

2. **Rate Limits**: La API de Groq tiene límites de requests por minuto. Si haces muchas creaciones, puedes recibir errores 429.

3. **Contexto**: Llama 3.3 70B tiene un límite de contexto. Si la conversación es muy larga, puede perder información.

## Troubleshooting

### "No se ven los gastos creados"
- Verifica los logs del servidor
- Revisa si hay errores en la consola
- Asegúrate de que GROQ_API_KEY está configurada
- Recarga la página de gastos

### "Error: Cuenta de Caja no encontrada"
- Ejecuta: `npm run db:seed`
- O la función `ensureBasicAccounts()` debería crearlas automáticamente

### "La IA no llama las funciones"
- Verifica que estás usando el modelo correcto: `llama-3.3-70b-versatile`
- Revisa los logs para ver si hay errores de API
- Prueba con un prompt más directo: "Ejecuta create_expense con amount: 100, description: 'Test'"

## Contacto y Soporte

Si el problema persiste:
1. Revisa los logs completos del servidor
2. Verifica la configuración de `.env`
3. Ejecuta el script de prueba
4. Contacta al equipo de desarrollo con los logs

---

**Última actualización:** 2025-12-27
**Versión:** 1.0.0
