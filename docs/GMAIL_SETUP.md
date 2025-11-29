# Gmail API Setup - Bandeja de Entrada de Documentos

Esta guía te ayuda a configurar la integración con Gmail para recibir documentos contables de tus clientes.

## 📋 Tabla de Contenido

1. [Resumen del Sistema](#resumen-del-sistema)
2. [Crear Proyecto en Google Cloud](#crear-proyecto-en-google-cloud)
3. [Habilitar Gmail API](#habilitar-gmail-api)
4. [Configurar Pantalla de Consentimiento](#configurar-pantalla-de-consentimiento)
5. [Crear Credenciales OAuth](#crear-credenciales-oauth)
6. [Configurar Variables de Entorno](#configurar-variables-de-entorno)
7. [Conectar Gmail desde la App](#conectar-gmail-desde-la-app)
8. [Uso del Sistema](#uso-del-sistema)

---

## 🎯 Resumen del Sistema

### ¿Cómo funciona?

1. **Tus clientes** envían documentos a tu correo Gmail dedicado (ej: `tuempresa.docs@gmail.com`)
2. **Incluyen un código** en el asunto: `[ABC123] Factura de proveedor X`
3. **La app** revisa tu Gmail periódicamente y clasifica los emails por empresa
4. **Los documentos** aparecen en la bandeja de entrada de cada empresa

### Beneficios

✅ **100% Gratis** - Usa tu propia cuenta Gmail  
✅ **Sin dominio propio** - No necesitas comprar dominio  
✅ **Fácil para clientes** - Solo envían email normal  
✅ **Automático** - Clasifica documentos por código de empresa  

---

## 1️⃣ Crear Proyecto en Google Cloud

### Paso 1.1: Acceder a Google Cloud Console

1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. Inicia sesión con tu cuenta Google (la misma que usarás para recibir emails)

### Paso 1.2: Crear nuevo proyecto

1. Haz clic en el selector de proyecto (arriba a la izquierda)
2. Clic en **"NUEVO PROYECTO"**
3. Completa:
   - **Nombre del proyecto**: `QuickBooks Clone Email` (o el nombre que prefieras)
   - **Organización**: Déjalo vacío si no tienes organización
4. Clic en **"CREAR"**
5. Espera ~30 segundos a que se cree
6. Asegúrate de seleccionar el proyecto recién creado

---

## 2️⃣ Habilitar Gmail API

### Paso 2.1: Ir a la biblioteca de APIs

1. En el menú lateral, ve a **"APIs y servicios"** → **"Biblioteca"**
2. O accede directamente: [console.cloud.google.com/apis/library](https://console.cloud.google.com/apis/library)

### Paso 2.2: Buscar y habilitar Gmail API

1. En el buscador, escribe: `Gmail API`
2. Clic en **"Gmail API"** (el de Google)
3. Clic en el botón azul **"HABILITAR"**
4. Espera a que se active

---

## 3️⃣ Configurar Pantalla de Consentimiento

### Paso 3.1: Ir a configuración OAuth

1. En el menú lateral: **"APIs y servicios"** → **"Pantalla de consentimiento de OAuth"**
2. O accede: [console.cloud.google.com/apis/credentials/consent](https://console.cloud.google.com/apis/credentials/consent)

### Paso 3.2: Seleccionar tipo de usuario

1. Selecciona **"Externo"** (a menos que tengas Google Workspace)
2. Clic en **"CREAR"**

### Paso 3.3: Información de la app

Completa los campos:

| Campo | Valor |
|-------|-------|
| Nombre de la app | `QuickBooks Clone` |
| Correo de asistencia | Tu email |
| Logo | (opcional) |
| Página principal | `http://localhost:3000` (o tu dominio) |
| Política de privacidad | `http://localhost:3000/privacy` |
| Términos de servicio | `http://localhost:3000/terms` |
| Correos autorizados | Tu email |

Clic en **"GUARDAR Y CONTINUAR"**

### Paso 3.4: Agregar alcances (scopes)

1. Clic en **"AGREGAR O ELIMINAR ALCANCES"**
2. Busca y selecciona:
   - `https://www.googleapis.com/auth/gmail.readonly` - Leer emails
   - `https://www.googleapis.com/auth/gmail.modify` - Marcar como leído
3. Clic en **"ACTUALIZAR"**
4. Clic en **"GUARDAR Y CONTINUAR"**

### Paso 3.5: Usuarios de prueba (IMPORTANTE)

⚠️ **Mientras la app está en modo "Prueba", solo los usuarios agregados aquí pueden usarla**

1. Clic en **"+ AGREGAR USUARIOS"**
2. Agrega tu email Gmail (el que usarás para recibir documentos)
3. Clic en **"AGREGAR"**
4. Clic en **"GUARDAR Y CONTINUAR"**

### Paso 3.6: Revisar y confirmar

1. Revisa el resumen
2. Clic en **"VOLVER AL PANEL"**

---

## 4️⃣ Crear Credenciales OAuth

### Paso 4.1: Ir a credenciales

1. En el menú lateral: **"APIs y servicios"** → **"Credenciales"**
2. O accede: [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)

### Paso 4.2: Crear credenciales OAuth

1. Clic en **"+ CREAR CREDENCIALES"**
2. Selecciona **"ID de cliente de OAuth"**

### Paso 4.3: Configurar cliente OAuth

| Campo | Valor |
|-------|-------|
| Tipo de aplicación | **Aplicación web** |
| Nombre | `QuickBooks Clone Web` |

### Paso 4.4: Agregar URIs de redirección

En **"URIs de redirección autorizados"**, clic en **"+ AGREGAR URI"**:

**Para desarrollo local:**
```
http://localhost:3000/api/auth/gmail/callback
```

**Para producción (cuando tengas dominio):**
```
https://tudominio.com/api/auth/gmail/callback
```

### Paso 4.5: Crear y copiar credenciales

1. Clic en **"CREAR"**
2. Aparecerá un popup con:
   - **Tu ID de cliente**: `XXXXX.apps.googleusercontent.com`
   - **Tu secreto de cliente**: `GOCSPX-XXXXX`
3. **¡COPIA AMBOS VALORES!** Los necesitarás en el siguiente paso

⚠️ **IMPORTANTE**: Guarda el secreto en un lugar seguro. No lo compartás.

---

## 5️⃣ Configurar Variables de Entorno

### Paso 5.1: Editar archivo .env.local

Abre o crea el archivo `.env.local` en la raíz del proyecto:

```bash
# Gmail API Configuration
GMAIL_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-tu-secreto
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback

# Base URL de la app
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Paso 5.2: Para producción

Cuando despliegues a producción, actualiza:

```bash
GMAIL_REDIRECT_URI=https://tudominio.com/api/auth/gmail/callback
NEXT_PUBLIC_BASE_URL=https://tudominio.com
```

---

## 6️⃣ Conectar Gmail desde la App

### Paso 6.1: Reiniciar el servidor

```bash
npm run dev
```

### Paso 6.2: Autorizar Gmail

1. Ve a: `http://localhost:3000/company/settings/integrations`
2. O directamente a: `http://localhost:3000/api/auth/gmail`
3. Se abrirá la pantalla de Google para autorizar
4. Selecciona tu cuenta Gmail
5. Acepta los permisos solicitados
6. Serás redirigido de vuelta a la app

### Paso 6.3: Verificar conexión

Una vez autorizado, verás confirmación en la página de integraciones.

---

## 7️⃣ Uso del Sistema

### Para ti (dueño del sistema)

1. **Comparte tu email** con tus clientes: `tuempresa.docs@gmail.com`
2. **Asigna un código** a cada empresa/cliente (ej: `ABC123`, `ACME01`, etc.)
3. **Revisa la bandeja** en: `/company/documents/inbox`

### Para tus clientes

Instrúyeles que envíen emails con el formato:

```
Para: tuempresa.docs@gmail.com
Asunto: [ABC123] Factura del proveedor XYZ

Adjunto factura del mes.
```

El código `[ABC123]` permite clasificar automáticamente el documento.

### Formatos válidos para el código

```
Asunto: [CODIGO] Descripción del documento
Asunto: [acme123] Factura noviembre        ← funciona en minúsculas
```

O en el cuerpo del email:
```
Empresa: ABC123
Código: ABC123
```

---

## 🔧 Solución de Problemas

### Error: "Access blocked: This app's request is invalid"

**Causa**: Falta agregar la URI de redirección correcta
**Solución**: 
1. Ve a Google Cloud Console → Credenciales
2. Edita tu OAuth Client
3. Agrega exactamente: `http://localhost:3000/api/auth/gmail/callback`

### Error: "Error 403: access_denied"

**Causa**: Tu email no está en la lista de usuarios de prueba
**Solución**:
1. Ve a Pantalla de consentimiento OAuth
2. En "Usuarios de prueba", agrega tu email

### Error: "invalid_grant"

**Causa**: El token expiró o fue revocado
**Solución**: 
1. Vuelve a autorizar en `/api/auth/gmail`
2. En producción, implementar refresh tokens

### Los emails no aparecen

**Causa**: Los emails no tienen el código de empresa
**Solución**: 
1. Asegúrate que el asunto tenga `[CODIGO]`
2. Usa el botón "Revisar Inbox" en la página de documentos

---

## 📝 Notas Adicionales

### Límites de Gmail API

- **Cuota diaria**: 1,000,000,000 unidades de cuota
- **Por usuario**: 250 unidades de cuota por segundo
- En práctica, puedes hacer miles de lecturas por día sin problema

### Seguridad

- Los tokens se almacenan en memoria (para desarrollo)
- Para producción, guarda tokens encriptados en la base de datos
- Nunca expongas tu `GMAIL_CLIENT_SECRET` en el frontend

### Publicar la app (opcional)

Para salir del modo "Prueba" y permitir cualquier usuario:
1. Ve a Pantalla de consentimiento OAuth
2. Clic en "PUBLICAR APP"
3. Completa el proceso de verificación de Google

Esto es necesario solo si quieres que usuarios externos autoricen su Gmail.

---

## 🎉 ¡Listo!

Tu sistema de bandeja de entrada está configurado. Los documentos que recibas por email aparecerán automáticamente clasificados en `/company/documents/inbox`.
