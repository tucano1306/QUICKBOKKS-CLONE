# QuickBooks Clone

Un sistema completo de gestión financiera y contable construido con Next.js, TypeScript, Prisma y PostgreSQL.

## 🚀 Características

### Gestión de Clientes
- CRUD completo de clientes
- Información de contacto detallada
- Historial de facturas por cliente
- Estados activo/inactivo

### Productos y Servicios
- Catálogo de productos y servicios
- Gestión de precios y costos
- Soporte para SKU
- Categorización
- Cálculo automático de impuestos

### Facturación
- Creación y edición de facturas
- Numeración automática
- Múltiples estados (Borrador, Enviada, Pagada, Vencida, etc.)
- Cálculo automático de subtotales, impuestos y descuentos
- Historial de pagos
- Exportación a PDF

### Gastos
- Registro de gastos y categorías
- Clasificación por tipo
- Documentos adjuntos
- Gastos deducibles de impuestos
- Múltiples métodos de pago

### Nómina
- Gestión de empleados
- Registro de nóminas
- Deducciones y bonificaciones
- Diferentes tipos de salario (por hora, mensual, etc.)
- Historial de pagos

### Banca
- Múltiples cuentas bancarias
- Registro de transacciones
- Conciliación bancaria
- Balance de cuentas

### Reportes
- Dashboard con métricas en tiempo real
- Reportes de ingresos y gastos
- Análisis de rentabilidad
- Reportes fiscales

### Autenticación y Seguridad
- Sistema de autenticación con NextAuth.js
- Roles de usuario (Usuario, Administrador, Contador)
- Sesiones seguras con JWT

## 🛠️ Tecnologías

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI**: TailwindCSS, Radix UI, Lucide Icons
- **Backend**: Next.js API Routes
- **Base de Datos**: PostgreSQL con Prisma ORM
- **Autenticación**: NextAuth.js
- **Validación**: Zod
- **Formularios**: React Hook Form
- **Notificaciones**: React Hot Toast
- **Tablas**: TanStack Table
- **Gráficos**: Chart.js, React-ChartJS-2
- **Exportación**: jsPDF, XLSX

## 📋 Requisitos Previos

- Node.js 18+ 
- PostgreSQL 14+
- npm o yarn

## 🔧 Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd quickbooks-clone
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env` en la raíz del proyecto:

```env
# Database
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/quickbooks_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-key-muy-segura-aqui"

# Email (opcional)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="tu-email@gmail.com"
EMAIL_SERVER_PASSWORD="tu-contraseña"
EMAIL_FROM="noreply@tudominio.com"
```

4. **Configurar la base de datos**

```bash
# Generar el cliente de Prisma
npx prisma generate

# Ejecutar las migraciones
npx prisma migrate dev --name init

# (Opcional) Poblar con datos de ejemplo
npx prisma db seed
```

5. **Iniciar el servidor de desarrollo**

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
quickbooks-clone/
├── prisma/
│   └── schema.prisma          # Esquema de base de datos
├── src/
│   ├── app/
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # Autenticación
│   │   │   ├── customers/     # Endpoints de clientes
│   │   │   ├── products/      # Endpoints de productos
│   │   │   ├── invoices/      # Endpoints de facturas
│   │   │   ├── expenses/      # Endpoints de gastos
│   │   │   ├── employees/     # Endpoints de nómina
│   │   │   └── dashboard/     # Estadísticas
│   │   ├── auth/              # Páginas de autenticación
│   │   ├── dashboard/         # Dashboard principal
│   │   ├── customers/         # Gestión de clientes
│   │   ├── products/          # Gestión de productos
│   │   ├── invoices/          # Gestión de facturas
│   │   ├── expenses/          # Gestión de gastos
│   │   ├── payroll/           # Gestión de nómina
│   │   ├── banking/           # Gestión bancaria
│   │   ├── reports/           # Reportes
│   │   └── settings/          # Configuración
│   ├── components/
│   │   ├── ui/                # Componentes UI base
│   │   └── layout/            # Componentes de layout
│   └── lib/
│       ├── auth.ts            # Configuración de autenticación
│       ├── prisma.ts          # Cliente de Prisma
│       └── utils.ts           # Utilidades
├── .env                       # Variables de entorno
├── .env.example              # Ejemplo de variables
├── next.config.js            # Configuración de Next.js
├── tailwind.config.ts        # Configuración de Tailwind
└── package.json              # Dependencias
```

## 🚦 Scripts Disponibles

```bash
npm run dev          # Inicia el servidor de desarrollo
npm run build        # Construye la aplicación para producción
npm run start        # Inicia el servidor de producción
npm run lint         # Ejecuta el linter
npm run prisma:studio # Abre Prisma Studio
npm run prisma:migrate # Ejecuta migraciones
npm run prisma:generate # Genera el cliente de Prisma
```

## 📊 Modelo de Datos

El sistema cuenta con los siguientes modelos principales:

- **User**: Usuarios del sistema
- **Customer**: Clientes
- **Product**: Productos y servicios
- **Invoice**: Facturas
- **InvoiceItem**: Líneas de factura
- **Payment**: Pagos
- **Expense**: Gastos
- **ExpenseCategory**: Categorías de gastos
- **Employee**: Empleados
- **Payroll**: Nóminas
- **BankAccount**: Cuentas bancarias
- **BankTransaction**: Transacciones bancarias
- **TaxReturn**: Declaraciones fiscales

## 🔐 Autenticación

El sistema usa NextAuth.js con las siguientes características:

- Autenticación con credenciales (email/contraseña)
- Sesiones JWT
- Roles de usuario (USER, ADMIN, ACCOUNTANT)
- Protección de rutas

## 🎨 Personalización

### Colores y Tema

Edita `src/app/globals.css` para personalizar los colores y el tema:

```css
@layer base {
  :root {
    --primary: 222.2 47.4% 11.2%;
    --secondary: 210 40% 96.1%;
    /* ... más variables */
  }
}
```

### Logo y Branding

Reemplaza el texto "QuickBooks Clone" en `src/components/layout/sidebar.tsx` con tu logo personalizado.

## 📱 Responsive Design

La aplicación es completamente responsive y funciona en:
- 📱 Móviles
- 📲 Tablets  
- 💻 Desktop

## 🌐 Despliegue

### Vercel (Recomendado)

1. Push tu código a GitHub
2. Importa el proyecto en Vercel
3. Configura las variables de entorno
4. Despliega

### Otras Plataformas

La aplicación puede desplegarse en cualquier plataforma que soporte Next.js:
- Railway
- Render
- DigitalOcean App Platform
- AWS Amplify
- Heroku

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👨‍💻 Autor

Desarrollado con ❤️ por tu equipo

## 🐛 Reportar Bugs

Si encuentras un bug, por favor abre un issue en GitHub con:
- Descripción del bug
- Pasos para reproducirlo
- Comportamiento esperado
- Screenshots (si aplica)

## 📞 Soporte

Para soporte, envía un email a soporte@tudominio.com o abre un issue en GitHub.

## 🗺️ Roadmap

- [ ] Integración con pasarelas de pago
- [ ] Facturación electrónica (CFDI México)
- [ ] App móvil con React Native
- [ ] Integración con bancos (API bancaria)
- [ ] Multi-tenancy
- [ ] Módulo de inventario avanzado
- [ ] Reportes personalizables
- [ ] Exportación a diferentes formatos
- [ ] Recordatorios automáticos
- [ ] Panel de análisis avanzado

---

⭐ Si te gusta este proyecto, ¡dale una estrella en GitHub!
