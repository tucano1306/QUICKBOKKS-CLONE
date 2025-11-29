# Configuración de Email Inbound con SendGrid

## 🚀 Pasos para configurar SendGrid Inbound Parse (GRATIS - 100 emails/día)

### 1. Crear cuenta en SendGrid
1. Ve a https://sendgrid.com/free/
2. Crea cuenta gratuita
3. Verifica tu email

### 2. Configurar dominio para recibir emails
En el DNS de tu dominio (Cloudflare, GoDaddy, Namecheap, etc.), agrega:

```
Tipo: MX
Host: inbox (o @ para todo el dominio)
Valor: mx.sendgrid.net
Prioridad: 10
TTL: 3600
```

Esto significa que los emails a `*@inbox.tudominio.com` irán a SendGrid.

### 3. Configurar Inbound Parse en SendGrid

1. Ve a **Settings > Inbound Parse** en SendGrid dashboard
2. Click "Add Host & URL"
3. Configura:
   - **Receiving Domain**: `inbox.tudominio.com`
   - **Destination URL**: `https://tuapp.com/api/email/sendgrid/webhook`
   - **Check**: "POST the raw, full MIME message"
   - **Check**: "Check incoming emails for spam"

### 4. Variables de entorno necesarias

Agrega a tu `.env`:
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_WEBHOOK_SECRET=tu_secreto_personalizado
NEXT_PUBLIC_EMAIL_DOMAIN=inbox.tudominio.com
```

### 5. Cómo funciona

Cada empresa tendrá un código único (ej: `ABC123`), y recibirá emails en:
- `ABC123@inbox.tudominio.com`
- O: `docs+ABC123@tudominio.com`

Cuando un cliente envía un email a esa dirección:
1. SendGrid recibe el email
2. SendGrid hace POST a tu webhook con todos los datos
3. Tu app identifica la empresa por el código
4. Procesa adjuntos (facturas, recibos) con IA
5. Crea registros automáticamente en la empresa correcta

### 6. Formatos de email soportados

El cliente puede enviar:
- **Adjuntos PDF**: Facturas, estados de cuenta
- **Imágenes**: Fotos de recibos
- **Solo texto**: Datos de transacciones
- **Excel/CSV**: Datos de nómina, gastos

### 7. Seguridad

- Verificamos firma de SendGrid en cada webhook
- Solo procesamos emails para empresas registradas
- Rate limiting para prevenir spam
- Logs de auditoría de todos los emails recibidos

### 8. Límites del plan gratuito

- **100 emails/día** (suficiente para ~3-5 empresas pequeñas)
- Sin límite de adjuntos
- Webhooks ilimitados

Para más volumen, el plan de $20/mes incluye 40,000 emails.
