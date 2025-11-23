# 🚀 Guía de Inicio Rápido - QuickBooks Clone

## Paso 1: Instalar Dependencias

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
npm install
```

## Paso 2: Configurar Base de Datos PostgreSQL

### Opción A: PostgreSQL Local

1. **Instalar PostgreSQL** (si no lo tienes):
   - Descarga desde: https://www.postgresql.org/download/windows/
   - Instala con las opciones por defecto
   - Recuerda la contraseña del usuario `postgres`

2. **Crear la base de datos**:
   ```powershell
   # Abrir psql (PostgreSQL CLI)
   psql -U postgres

   # Dentro de psql:
   CREATE DATABASE quickbooks_db;
   \q
   ```

### Opción B: PostgreSQL en la Nube (Recomendado para desarrollo)

Puedes usar servicios gratuitos como:
- **Railway**: https://railway.app/
- **Supabase**: https://supabase.com/
- **Neon**: https://neon.tech/

## Paso 3: Configurar Variables de Entorno

1. **Copia el archivo de ejemplo**:
   ```powershell
   Copy-Item .env.example .env
   ```

2. **Edita el archivo `.env`** con tus valores:

   ```env
   # Para PostgreSQL local:
   DATABASE_URL="postgresql://postgres:tu_contraseña@localhost:5432/quickbooks_db"

   # Para PostgreSQL en Railway (ejemplo):
   # DATABASE_URL="postgresql://postgres:contraseña@containers-us-west-123.railway.app:5432/railway"

   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="genera-un-secret-aleatorio-aqui"
   ```

3. **Generar NEXTAUTH_SECRET**:
   ```powershell
   # En PowerShell:
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
   ```
   Copia el resultado en `NEXTAUTH_SECRET`

## Paso 4: Configurar Prisma y Base de Datos

```powershell
# Generar el cliente de Prisma
npx prisma generate

# Ejecutar migraciones (crear tablas)
npx prisma migrate dev --name init

# Poblar con datos de ejemplo (opcional pero recomendado)
npm run prisma:seed
```

## Paso 5: Iniciar el Servidor

```powershell
npm run dev
```

El servidor estará corriendo en: **http://localhost:3000**

## Paso 6: Primer Login

Si ejecutaste el seed, puedes iniciar sesión con:

- **Email**: `admin@quickbooks.com`
- **Password**: `admin123`

Si no ejecutaste el seed, ve a http://localhost:3000 y regístrate con una nueva cuenta.

## 📁 Estructura del Proyecto

```
quickbooks-clone/
├── src/
│   ├── app/
│   │   ├── api/              # Endpoints REST
│   │   ├── auth/             # Login/Registro
│   │   ├── dashboard/        # Dashboard principal
│   │   ├── customers/        # Gestión de clientes
│   │   ├── products/         # Gestión de productos
│   │   ├── invoices/         # Gestión de facturas
│   │   ├── expenses/         # Gestión de gastos
│   │   ├── payroll/          # Nómina (por implementar)
│   │   ├── banking/          # Bancos (por implementar)
│   │   └── reports/          # Reportes
│   ├── components/           # Componentes reutilizables
│   └── lib/                  # Utilidades y configuración
├── prisma/
│   ├── schema.prisma         # Esquema de base de datos
│   └── seed.ts              # Datos de ejemplo
└── public/                   # Archivos estáticos
```

## 🛠️ Comandos Útiles

```powershell
# Desarrollo
npm run dev                    # Iniciar servidor de desarrollo
npm run build                  # Construir para producción
npm run start                  # Iniciar servidor de producción

# Prisma
npm run prisma:studio          # Abrir interfaz visual de BD
npm run prisma:migrate         # Crear nueva migración
npm run prisma:generate        # Generar cliente de Prisma
npm run prisma:seed            # Poblar con datos de ejemplo

# Otros
npm run lint                   # Verificar código
```

## 🎯 Funcionalidades Implementadas

### ✅ Completado
- [x] Sistema de autenticación (Login/Registro)
- [x] Dashboard con métricas
- [x] CRUD de Clientes
- [x] CRUD de Productos/Servicios
- [x] Gestión de Facturas
- [x] Gestión de Gastos
- [x] Módulo de Reportes
- [x] API REST completa
- [x] Diseño responsive
- [x] Base de datos con Prisma

### 🚧 Por Implementar (Funcionalidades avanzadas)
- [ ] Formularios de creación/edición para cada módulo
- [ ] Nómina completa con cálculos
- [ ] Módulo bancario completo
- [ ] Generación de PDF para facturas
- [ ] Exportación de reportes a Excel
- [ ] Gráficos y análisis avanzados
- [ ] Notificaciones por email
- [ ] Recordatorios automáticos
- [ ] Multi-tenancy (múltiples empresas)

## 🐛 Solución de Problemas

### Error: "Cannot connect to database"
- Verifica que PostgreSQL esté corriendo
- Verifica la URL de conexión en `.env`
- Prueba la conexión: `npx prisma db push`

### Error: "Module not found"
- Ejecuta: `npm install`
- Verifica que `node_modules` exista

### Error: "Port 3000 is already in use"
- Cambia el puerto: `$env:PORT=3001; npm run dev`
- O cierra la aplicación que usa el puerto 3000

### Páginas en blanco o errores 404
- Verifica que el servidor esté corriendo
- Limpia la caché: `rm -r .next; npm run dev`

## 📊 Acceso a la Base de Datos

Para ver y editar datos directamente:

```powershell
npm run prisma:studio
```

Esto abrirá una interfaz web en http://localhost:5555

## 🔐 Seguridad

**Importante**: Antes de desplegar en producción:

1. Cambia `NEXTAUTH_SECRET` por un valor único y seguro
2. Usa una base de datos PostgreSQL en producción
3. Configura variables de entorno en tu plataforma de hosting
4. Nunca subas el archivo `.env` a Git (ya está en .gitignore)

## 📱 Responsive Design

La aplicación funciona en:
- 📱 Móviles (320px+)
- 📲 Tablets (768px+)
- 💻 Desktop (1024px+)

## 🚀 Despliegue

### Vercel (Más fácil)

1. Sube tu código a GitHub
2. Ve a https://vercel.com/
3. Importa tu repositorio
4. Configura las variables de entorno
5. Despliega

### Railway

1. Ve a https://railway.app/
2. Conecta tu repositorio de GitHub
3. Añade PostgreSQL desde el marketplace
4. Configura las variables de entorno
5. Despliega

## 📚 Recursos Adicionales

- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **NextAuth.js**: https://next-auth.js.org/
- **TailwindCSS**: https://tailwindcss.com/docs

## 💡 Próximos Pasos

1. **Familiarízate con el código**: Explora la estructura de archivos
2. **Prueba las funcionalidades**: Crea clientes, productos y facturas
3. **Personaliza**: Cambia colores, logos y textos
4. **Implementa lo que falta**: Formularios, exportación PDF, etc.
5. **Despliega**: Sube tu aplicación a producción

## 🤝 Soporte

Si tienes problemas:
1. Revisa los errores en la consola del navegador (F12)
2. Revisa los logs del servidor en la terminal
3. Verifica que todas las dependencias estén instaladas
4. Consulta la documentación de las tecnologías usadas

---

## 🎉 ¡Listo para empezar!

Tu clon de QuickBooks está listo para usar. Empieza creando tus primeros clientes y facturas.

**Usuario de prueba (si ejecutaste el seed)**:
- Email: admin@quickbooks.com
- Password: admin123

¡Buena suerte con tu proyecto! 🚀
