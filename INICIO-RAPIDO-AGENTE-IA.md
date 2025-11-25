# 🚀 INICIO RÁPIDO - AGENTE IA

## ⚡ Configuración en 2 Minutos

### Paso 1: Elige tu proveedor de IA

#### OPCIÓN A: OpenAI GPT-4 (RECOMENDADO - MÁS FÁCIL)

1. **Obtén tu API Key**:
   - Ve a: https://platform.openai.com/api-keys
   - Click en "Create new secret key"
   - Copia la key (empieza con `sk-proj-...`)

2. **Configura .env**:
   ```bash
   # Crea el archivo .env si no existe
   cp .env.example .env
   ```

3. **Agrega tu API Key en .env**:
   ```env
   AI_PROVIDER=openai
   OPENAI_API_KEY=sk-proj-tu-api-key-aqui
   ```

4. **¡Listo!** El agente está configurado.

**Costo:** ~$1/mes con uso normal (100 conversaciones)

---

#### OPCIÓN B: Llama 3 Local (GRATIS - PRIVACIDAD TOTAL)

1. **Instala Ollama**:
   
   **Windows:**
   ```bash
   # Descarga e instala desde: https://ollama.com/download
   ```

   **Mac/Linux:**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Descarga Llama 3**:
   ```bash
   ollama pull llama3
   ```

3. **Inicia el servidor**:
   ```bash
   ollama serve
   ```
   Esto inicia Ollama en `http://localhost:11434`

4. **Configura .env**:
   ```env
   AI_PROVIDER=llama
   LLAMA_ENDPOINT=http://localhost:11434
   ```

5. **¡Listo!** Agente local funcionando.

**Ventajas:** Gratis, sin límites, privacidad total

---

#### OPCIÓN C: Mixtral Local (ALTERNATIVA OPEN SOURCE)

Similar a Llama 3:

```bash
# Instalar Ollama (si no lo tienes)
curl -fsSL https://ollama.com/install.sh | sh

# Descargar Mixtral
ollama pull mixtral

# Iniciar servidor
ollama serve
```

**Configurar .env:**
```env
AI_PROVIDER=mixtral
MIXTRAL_ENDPOINT=http://localhost:11434
```

---

## 🎮 Usar el Agente

### 1. Inicia la aplicación

```bash
npm run dev
```

### 2. Navega al chat

Abre: http://localhost:3000/ai-agent

### 3. ¡Prueba estos comandos!

```
📝 "Crea una factura para el cliente ABC por $5,000"
💰 "Registra un gasto de $250 en suministros de oficina"
👥 "Crea un nuevo cliente llamado Tech Solutions Inc"
📊 "Genera el estado de resultados de este mes"
🔍 "Busca todas las facturas mayores a $1,000"
📈 "Dame mi resumen financiero"
```

---

## 🎯 Qué puede hacer el agente

✅ **Crear facturas** automáticamente
✅ **Registrar gastos** con categorización ML
✅ **Gestionar clientes** (crear, buscar, actualizar)
✅ **Generar reportes** (balance, estado de resultados, etc.)
✅ **Buscar transacciones** por múltiples criterios
✅ **Análisis financiero** inteligente
✅ **Recomendaciones** personalizadas

---

## 🆘 Troubleshooting

### Error: "OpenAI no está configurado"
✅ **Solución:** Verifica que `OPENAI_API_KEY` está en tu archivo `.env`

### Error: "Llama API error"
✅ **Solución:** Asegúrate de que Ollama está corriendo:
```bash
# Ver si está corriendo
curl http://localhost:11434/api/tags

# Si no está corriendo
ollama serve
```

### El agente no responde
✅ **Solución:** Revisa la consola del navegador (F12) y los logs del servidor

### Conversación no se guarda
✅ **Solución:** Verifica que la base de datos está corriendo y las migraciones aplicadas:
```bash
npm run prisma:migrate
```

---

## 💡 Tips Pro

### Conversaciones más baratas (OpenAI)
```env
# En ai-agent-service.ts, cambia el modelo:
model: 'gpt-3.5-turbo'  # 10x más barato
```

### Mejor rendimiento local
```bash
# Para Llama 3, usa versión optimizada:
ollama pull llama3:7b-instruct-q4_K_M
```

### Acceso rápido
Agrega el chat a tus favoritos: http://localhost:3000/ai-agent

---

## 📚 Documentación Completa

Lee **AGENTE-IA-GUIA.md** para:
- Personalizar el agente
- Agregar nuevas funciones
- Configurar streaming
- Desplegar en producción
- Y mucho más...

---

## 🎉 ¡Listo!

Tu agente IA está configurado. Navega a `/ai-agent` y empieza a darle órdenes.

**Ejemplo de primera conversación:**

```
Tú: "Hola, ¿qué puedes hacer?"

Agente: "¡Hola! Soy tu asistente financiero. Puedo crear facturas, 
registrar gastos, generar reportes y más. ¿En qué te ayudo?"

Tú: "Crea una factura para mi cliente XYZ Corp por $10,000"

Agente: "✅ Factura creada exitosamente!
- Cliente: XYZ Corp
- Monto: $10,000
- Impuestos: $600 (6%)
- Total: $10,600
- Número: INV-1732480000000

¿Quieres que la envíe por email?"
```

---

¿Preguntas? Revisa AGENTE-IA-GUIA.md o abre un issue.
