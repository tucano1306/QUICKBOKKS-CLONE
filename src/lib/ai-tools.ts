/**
 * AI TOOLS - Function Calling para el Asistente Contable
 *
 * Este archivo define las herramientas que la AI puede usar para
 * interactuar con la base de datos de forma inteligente.
 */

import { createExpenseWithJE, createTransactionWithJE } from '@/lib/accounting-service';
import { autoPopulateForm1040FromCompany } from '@/lib/form-1040-service';
import { prisma } from '@/lib/prisma';

/**
 * Parsear fecha correctamente desde diferentes formatos
 * YYYY-MM-DD, MM/DD/YYYY (formato americano), o ISO string
 */
function parseDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();

  // Si viene en formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.exec(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  // Si viene en formato MM/DD/YYYY (formato americano)
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.exec(dateStr)) {
    const [month, day, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  // Fallback - ISO o cualquier otro formato
  return new Date(dateStr);
}

// ============================================
// DEFINICIÓN DE HERRAMIENTAS (TOOLS)
// ============================================

export const AI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "crear_gasto",
      description: "Crea un nuevo gasto en el sistema. Usa esta función cuando el usuario quiera registrar un pago, gasto, compra o desembolso de dinero. Los gastos se guardan en el módulo de Gastos con categorías y asientos contables automáticos.",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "number",
            description: "Monto del gasto en dólares (sin símbolos, ej: 500.00)"
          },
          description: {
            type: "string",
            description: "Descripción breve del gasto (ej: 'Pago de seguro del vehículo')"
          },
          category: {
            type: "string",
            enum: ["Combustible", "Seguro", "Mantenimiento", "Salarios", "Alquiler", "Servicios", "Permisos", "Peajes", "Repuestos", "Vehiculo", "Oficina", "Marketing", "Viajes", "Otros"],
            description: "Categoría del gasto"
          },
          date: {
            type: "string",
            description: "Fecha del gasto en formato YYYY-MM-DD. Si no se especifica, usar fecha actual"
          },
          vendor: {
            type: "string",
            description: "Nombre del proveedor o vendedor (opcional)"
          }
        },
        required: ["amount", "description", "category"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "crear_ingreso",
      description: "Registra un nuevo ingreso, cobro o venta. Usa esta función cuando el usuario reciba dinero por servicios, ventas, cobros de facturas, etc.",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "number",
            description: "Monto del ingreso en dólares"
          },
          description: {
            type: "string",
            description: "Descripción del ingreso (ej: 'Cobro por servicio de transporte')"
          },
          category: {
            type: "string",
            description: "Categoría del ingreso (ej: 'Servicios', 'Ventas', 'Flete', 'Consultoría')"
          },
          date: {
            type: "string",
            description: "Fecha del ingreso en formato YYYY-MM-DD"
          },
          customer: {
            type: "string",
            description: "Nombre del cliente (opcional)"
          }
        },
        required: ["amount", "description"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_gastos",
      description: "Consulta los gastos registrados. Usa esta función para responder preguntas como '¿cuánto gasté?', '¿cuáles son mis gastos?', 'gastos del mes', etc.",
      parameters: {
        type: "object",
        properties: {
          periodo: {
            type: "string",
            enum: ["hoy", "semana", "mes", "año", "todo"],
            description: "Período de tiempo a consultar"
          },
          categoria: {
            type: "string",
            description: "Filtrar por categoría específica (opcional)"
          },
          mes: {
            type: "number",
            description: "Mes específico (1-12)"
          },
          año: {
            type: "number",
            description: "Año específico (ej: 2023, 2024)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_ingresos",
      description: "Consulta los ingresos registrados. Usa esta función para responder preguntas como '¿cuánto gané?', '¿cuáles son mis ventas?', 'ingresos del mes', etc.",
      parameters: {
        type: "object",
        properties: {
          periodo: {
            type: "string",
            enum: ["hoy", "semana", "mes", "año", "todo"],
            description: "Período de tiempo a consultar"
          },
          mes: {
            type: "number",
            description: "Mes específico (1-12)"
          },
          año: {
            type: "number",
            description: "Año específico"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_facturas",
      description: "Consulta facturas. Usa esta función para preguntas sobre facturas pendientes, vencidas, pagadas, o estado de facturación.",
      parameters: {
        type: "object",
        properties: {
          estado: {
            type: "string",
            enum: ["pendientes", "vencidas", "pagadas", "todas"],
            description: "Estado de las facturas a consultar"
          },
          cliente: {
            type: "string",
            description: "Nombre del cliente (opcional)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_clientes",
      description: "Consulta información de clientes. Usa para preguntas sobre clientes, quién debe más, mejores clientes, etc.",
      parameters: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            enum: ["todos", "con_deuda", "mejores", "inactivos"],
            description: "Tipo de consulta"
          },
          limite: {
            type: "number",
            description: "Número máximo de resultados"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "resumen_financiero",
      description: "Obtiene un resumen financiero general. Usa para preguntas como '¿cómo va el negocio?', 'situación financiera', 'balance general', 'cuánto tengo'.",
      parameters: {
        type: "object",
        properties: {
          periodo: {
            type: "string",
            enum: ["mes", "año", "todo"],
            description: "Período del resumen"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "crear_cliente",
      description: "Crea un nuevo cliente en el sistema.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Nombre del cliente o empresa"
          },
          email: {
            type: "string",
            description: "Email del cliente"
          },
          phone: {
            type: "string",
            description: "Teléfono"
          },
          address: {
            type: "string",
            description: "Dirección"
          }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "llenar_formularios_fiscales",      description: "Llena automáticamente el Form 1040 y formularios fiscales usando los datos de la empresa (ingresos, gastos, facturas pagadas). Úsalo cuando el usuario pida llenar, completar, preparar o calcular sus impuestos o formularios fiscales.",
      parameters: {
        type: "object",
        properties: {
          year: {
            type: "number",
            description: "Año fiscal a calcular (ej: 2024, 2025). Si no se especifica, usar el año fiscal anterior (el año más reciente para declarar impuestos, no el año corriente)."
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "crear_factura",
      description: "Crea una nueva factura para un cliente.",
      parameters: {
        type: "object",
        properties: {
          customerName: {
            type: "string",
            description: "Nombre del cliente"
          },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                quantity: { type: "number" },
                unitPrice: { type: "number" }
              }
            },
            description: "Líneas de la factura"
          },
          dueDate: {
            type: "string",
            description: "Fecha de vencimiento YYYY-MM-DD"
          }
        },
        required: ["customerName", "items"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_empleados",
      description: "Consulta la lista de empleados de la empresa. Úsalo cuando el usuario pregunte por empleados, personal, equipo, cuántos trabajan, sueldos, departamentos, etc.",
      parameters: {
        type: "object",
        properties: {
          estado: {
            type: "string",
            enum: ["activos", "inactivos", "todos"],
            description: "Estado de los empleados a consultar"
          },
          departamento: {
            type: "string",
            description: "Filtrar por departamento (opcional)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_nomina",
      description: "Consulta los registros de nómina, salarios pagados y deducciones. Úsalo cuando el usuario pregunte por nómina, pagos de salarios, cheques, período de nómina.",
      parameters: {
        type: "object",
        properties: {
          periodo: {
            type: "string",
            enum: ["mes", "año", "todo"],
            description: "Período de nómina a consultar"
          },
          mes: { type: "number", description: "Mes específico (1-12)" },
          año: { type: "number", description: "Año específico" }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_proveedores",
      description: "Consulta proveedores y cuentas por pagar. Úsalo cuando el usuario pregunte cuánto le debe a proveedores, facturas pendientes de pago, cuentas por pagar, etc.",
      parameters: {
        type: "object",
        properties: {
          estado: {
            type: "string",
            enum: ["pendientes", "vencidas", "pagadas", "todos"],
            description: "Estado de las cuentas por pagar"
          },
          nombre: {
            type: "string",
            description: "Nombre del proveedor (opcional)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_inventario",
      description: "Consulta productos e inventario. Úsalo cuando el usuario pregunte por productos, stock, inventario, cuánto hay en almacén, artículos bajo mínimo.",
      parameters: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            enum: ["todos", "bajo_minimo", "sin_stock", "activos"],
            description: "Tipo de consulta de inventario"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_cuentas_bancarias",
      description: "Consulta las cuentas bancarias, sus saldos actuales y transacciones recientes. Úsalo cuando el usuario pregunte cuánto hay en el banco, saldo de cuenta, movimientos bancarios.",
      parameters: {
        type: "object",
        properties: {
          incluir_transacciones: {
            type: "boolean",
            description: "Si incluir transacciones recientes (últimas 10)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_proyectos",
      description: "Consulta los proyectos activos, su estado, ingresos y gastos asociados. Úsalo cuando el usuario pregunte por proyectos, trabajos en curso, rentabilidad de proyectos.",
      parameters: {
        type: "object",
        properties: {
          estado: {
            type: "string",
            enum: ["activos", "completados", "todos"],
            description: "Estado de los proyectos"
          }
        },
        required: []
      }
    }
  }
];

// ============================================
// EJECUTORES DE HERRAMIENTAS
// ============================================

export async function executeToolCall(
  toolName: string,
  args: Record<string, any>,
  userId: string,
  companyId: string
): Promise<{ success: boolean; result: string; data?: any }> {

  console.log(`[AI Tools] Ejecutando: ${toolName}`, args);

  try {
    switch (toolName) {
      case 'crear_gasto':
        return await ejecutarCrearGasto(args as any, userId, companyId);

      case 'crear_ingreso':
        return await ejecutarCrearIngreso(args as any, userId, companyId);

      case 'consultar_gastos':
        return await ejecutarConsultarGastos(args as any, companyId);

      case 'consultar_ingresos':
        return await ejecutarConsultarIngresos(args as any, companyId);

      case 'consultar_facturas':
        return await ejecutarConsultarFacturas(args as any, userId, companyId);

      case 'consultar_clientes':
        return await ejecutarConsultarClientes(args as any, companyId);

      case 'resumen_financiero':
        return await ejecutarResumenFinanciero(args as any, companyId);

      case 'crear_cliente':
        return await ejecutarCrearCliente(args as any, companyId);

      case 'crear_factura':
        return await ejecutarCrearFactura(args as any, userId, companyId);

      case 'consultar_empleados':
        return await ejecutarConsultarEmpleados(args as any, companyId);

      case 'consultar_nomina':
        return await ejecutarConsultarNomina(args as any, companyId);

      case 'consultar_proveedores':
        return await ejecutarConsultarProveedores(args as any, companyId);

      case 'consultar_inventario':
        return await ejecutarConsultarInventario(args as any, companyId);

      case 'consultar_cuentas_bancarias':
        return await ejecutarConsultarCuentasBancarias(args as any, companyId);

      case 'consultar_proyectos':
        return await ejecutarConsultarProyectos(args as any, companyId);

      case 'llenar_formularios_fiscales':
        return await ejecutarLlenarFormulariosFiscales(args as any, userId, companyId);

      default:
        return { success: false, result: `Herramienta desconocida: ${toolName}` };
    }
  } catch (error: any) {
    console.error(`[AI Tools] Error en ${toolName}:`, error);
    return { success: false, result: `Error: ${error.message}` };
  }
}

// ============================================
// IMPLEMENTACIÓN DE CADA HERRAMIENTA
// ============================================

async function ejecutarCrearGasto(
  args: { amount: number; description: string; category: string; date?: string; vendor?: string },
  userId: string,
  companyId: string
) {
  // Parsear fecha correctamente
  const expenseDate = parseDate(args.date);

  // Buscar o crear categoría
  let category = await prisma.expenseCategory.findFirst({
    where: {
      companyId,
      name: { contains: args.category, mode: 'insensitive' }
    }
  });

  if (!category) {
    category = await prisma.expenseCategory.create({
      data: {
        name: args.category,
        description: `Categoría ${args.category}`,
        type: 'OPERATING',
        companyId
      }
    });
  }

  // Crear gasto con Journal Entry
  const { expense } = await createExpenseWithJE({
    companyId,
    userId,
    categoryId: category.id,
    categoryName: category.name,
    amount: args.amount,
    description: args.description,
    date: expenseDate,
    paymentMethod: 'OTHER',
    vendor: args.vendor
  });

  const fechaFormato = expenseDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return {
    success: true,
    result: `Gasto registrado: $${args.amount.toLocaleString()} - ${args.description} (${args.category}) - ${fechaFormato}`,
    data: { expenseId: expense.id, amount: args.amount, category: args.category }
  };
}

async function ejecutarCrearIngreso(
  args: { amount: number; description: string; category?: string; date?: string; customer?: string },
  userId: string,
  companyId: string
) {
  const incomeDate = parseDate(args.date);

  const { transaction } = await createTransactionWithJE({
    companyId,
    userId,
    type: 'INCOME',
    category: args.category || 'Ingresos Generales',
    description: args.description,
    amount: args.amount,
    date: incomeDate,
    notes: args.customer ? `Cliente: ${args.customer}` : undefined
  });

  const fechaFormato = incomeDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return {
    success: true,
    result: `Ingreso registrado: $${args.amount.toLocaleString()} - ${args.description} - ${fechaFormato}`,
    data: { transactionId: transaction.id, amount: args.amount }
  };
}

async function ejecutarConsultarGastos(
  args: { periodo?: string; categoria?: string; mes?: number; año?: number },
  companyId: string
) {
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  const now = new Date();

  // Determinar rango de fechas
  if (args.mes && args.año) {
    startDate = new Date(args.año, args.mes - 1, 1);
    endDate = new Date(args.año, args.mes, 0, 23, 59, 59);
  } else if (args.año) {
    startDate = new Date(args.año, 0, 1);
    endDate = new Date(args.año, 11, 31, 23, 59, 59);
  } else {
    switch (args.periodo) {
      case 'hoy':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'semana':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'mes':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'año':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
    }
  }

  const where: any = { companyId };
  if (startDate && endDate) {
    where.date = { gte: startDate, lte: endDate };
  }
  if (args.categoria) {
    where.category = { name: { contains: args.categoria, mode: 'insensitive' } };
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
    orderBy: { date: 'desc' },
    take: 50
  });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Agrupar por categoría
  const porCategoria: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = e.category?.name || 'Sin categoría';
    porCategoria[cat] = (porCategoria[cat] || 0) + e.amount;
  });

  const categoriaList = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, monto]) => `${cat}: $${monto.toLocaleString()}`)
    .join('\n');

  return {
    success: true,
    result: `Total gastos: $${total.toLocaleString()} (${expenses.length} registros)\n\nPor categoría:\n${categoriaList}`,
    data: { total, count: expenses.length, porCategoria }
  };
}

async function ejecutarConsultarIngresos(
  args: { periodo?: string; mes?: number; año?: number },
  companyId: string
) {
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  const now = new Date();

  if (args.mes && args.año) {
    startDate = new Date(args.año, args.mes - 1, 1);
    endDate = new Date(args.año, args.mes, 0, 23, 59, 59);
  } else if (args.año) {
    startDate = new Date(args.año, 0, 1);
    endDate = new Date(args.año, 11, 31, 23, 59, 59);
  } else {
    switch (args.periodo) {
      case 'mes':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'año':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
    }
  }

  const where: any = { companyId, type: 'INCOME' };
  if (startDate && endDate) {
    where.date = { gte: startDate, lte: endDate };
  }

  const incomes = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
    take: 50
  });

  // También sumar facturas pagadas
  const invoiceWhere: any = { companyId, status: 'PAID' };
  if (startDate && endDate) {
    invoiceWhere.paidDate = { gte: startDate, lte: endDate };
  }

  const paidInvoices = await prisma.invoice.findMany({
    where: invoiceWhere
  });

  const totalTransactions = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalInvoices = paidInvoices.reduce((sum, i) => sum + i.total, 0);
  const total = totalTransactions + totalInvoices;

  return {
    success: true,
    result: `Total ingresos: $${total.toLocaleString()}\n- Por transacciones: $${totalTransactions.toLocaleString()} (${incomes.length})\n- Por facturas cobradas: $${totalInvoices.toLocaleString()} (${paidInvoices.length})`,
    data: { total, transactions: incomes.length, invoices: paidInvoices.length }
  };
}

async function ejecutarConsultarFacturas(
  args: { estado?: string; cliente?: string },
  userId: string,
  companyId: string
) {
  const where: any = { companyId };

  switch (args.estado) {
    case 'pendientes':
      where.status = { in: ['SENT', 'OVERDUE'] };
      break;
    case 'vencidas':
      where.status = 'OVERDUE';
      break;
    case 'pagadas':
      where.status = 'PAID';
      break;
  }

  if (args.cliente) {
    where.customer = { name: { contains: args.cliente, mode: 'insensitive' } };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { customer: true },
    orderBy: { dueDate: 'asc' },
    take: 20
  });

  const total = invoices.reduce((sum, i) => sum + i.total, 0);

  const lista = invoices.slice(0, 10).map(i =>
    `• ${i.invoiceNumber}: $${i.total.toLocaleString()} - ${i.customer.name} (${i.status})`
  ).join('\n');

  return {
    success: true,
    result: `${invoices.length} facturas encontradas - Total: $${total.toLocaleString()}\n\n${lista}`,
    data: { count: invoices.length, total }
  };
}

async function ejecutarConsultarClientes(
  args: { tipo?: string; limite?: number },
  companyId: string
) {
  const limit = args.limite || 10;

  let customers;

  switch (args.tipo) {
    case 'con_deuda':
      customers = await prisma.customer.findMany({
        where: {
          companyId,
          invoices: { some: { status: { in: ['SENT', 'OVERDUE'] } } }
        },
        include: {
          invoices: { where: { status: { in: ['SENT', 'OVERDUE'] } } }
        },
        take: limit
      });
      break;

    case 'mejores':
      customers = await prisma.customer.findMany({
        where: { companyId },
        include: {
          invoices: { where: { status: 'PAID' } }
        },
        take: limit
      });
      // Ordenar por total facturado
      customers = customers
        .map(c => ({
          ...c,
          totalFacturado: c.invoices.reduce((sum, i) => sum + i.total, 0)
        }))
        .sort((a, b) => b.totalFacturado - a.totalFacturado);
      break;

    default:
      customers = await prisma.customer.findMany({
        where: { companyId },
        take: limit
      });
  }

  const lista = customers.slice(0, 10).map((c: any) => {
    if (c.totalFacturado !== undefined) {
      return `• ${c.name}: $${c.totalFacturado.toLocaleString()} facturado`;
    }
    if (c.invoices) {
      const deuda = c.invoices.reduce((sum: number, i: any) => sum + i.total, 0);
      return `• ${c.name}: $${deuda.toLocaleString()} pendiente`;
    }
    return `• ${c.name}`;
  }).join('\n');

  return {
    success: true,
    result: `${customers.length} clientes:\n\n${lista}`,
    data: { count: customers.length }
  };
}

async function ejecutarResumenFinanciero(
  args: { periodo?: string },
  companyId: string
) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (args.periodo) {
    case 'mes':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'año':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(2020, 0, 1); // Historial completo desde 2020
  }

  const [expenses, incomes, invoicesPending, invoicesPaid, customers] = await Promise.all([
    prisma.expense.aggregate({
      where: { companyId, date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true
    }),
    prisma.transaction.aggregate({
      where: { companyId, type: 'INCOME', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true
    }),
    prisma.invoice.aggregate({
      where: { companyId, status: { in: ['SENT', 'OVERDUE'] } },
      _sum: { total: true },
      _count: true
    }),
    prisma.invoice.aggregate({
      where: { companyId, status: 'PAID', paidDate: { gte: startDate, lte: endDate } },
      _sum: { total: true }
    }),
    prisma.customer.count({ where: { companyId } })
  ]);

  const totalIngresos = (incomes._sum.amount || 0) + (invoicesPaid._sum.total || 0);
  const totalGastos = expenses._sum.amount || 0;
  const utilidad = totalIngresos - totalGastos;
  const pendienteCobrar = invoicesPending._sum.total || 0;

  return {
    success: true,
    result: `📊 **RESUMEN FINANCIERO**

💵 **Ingresos:** $${totalIngresos.toLocaleString()}
💸 **Gastos:** $${totalGastos.toLocaleString()}
${utilidad >= 0 ? '📈' : '📉'} **Utilidad:** $${utilidad.toLocaleString()}

📄 **Por cobrar:** $${pendienteCobrar.toLocaleString()} (${invoicesPending._count} facturas)
👥 **Clientes:** ${customers}`,
    data: { ingresos: totalIngresos, gastos: totalGastos, utilidad, pendiente: pendienteCobrar }
  };
}

async function ejecutarCrearCliente(
  args: { name: string; email?: string; phone?: string; address?: string },
  companyId: string
) {
  const customer = await prisma.customer.create({
    data: {
      name: args.name,
      email: args.email,
      phone: args.phone,
      address: args.address,
      companyId
    }
  });

  return {
    success: true,
    result: `Cliente "${args.name}" creado exitosamente`,
    data: { customerId: customer.id }
  };
}

async function ejecutarCrearFactura(
  args: { customerName: string; items: Array<{ description: string; quantity: number; unitPrice: number }>; dueDate?: string },
  userId: string,
  companyId: string
) {
  // Buscar cliente
  let customer = await prisma.customer.findFirst({
    where: { companyId, name: { contains: args.customerName, mode: 'insensitive' } }
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: { name: args.customerName, companyId }
    });
  }

  // Calcular totales
  const subtotal = args.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = subtotal * 0.07; // 7% Florida sales tax
  const total = subtotal + taxAmount;

  // Generar número de factura
  const count = await prisma.invoice.count({ where: { companyId } });
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

  const dueDate = args.dueDate ? new Date(args.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Buscar o crear producto genérico
  let product = await prisma.product.findFirst({ where: { companyId, name: 'Servicio General' } });
  if (!product) {
    product = await prisma.product.create({
      data: { name: 'Servicio General', price: 0, companyId }
    });
  }

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerId: customer.id,
      userId,
      companyId,
      dueDate,
      subtotal,
      taxAmount,
      total,
      status: 'DRAFT',
      items: {
        create: args.items.map(item => ({
          productId: product.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: 7,
          taxAmount: item.quantity * item.unitPrice * 0.07,
          total: item.quantity * item.unitPrice * 1.07,
          companyId
        }))
      }
    }
  });

  return {
    success: true,
    result: `Factura ${invoiceNumber} creada para ${customer.name} - Total: $${total.toLocaleString()}`,
    data: { invoiceId: invoice.id, invoiceNumber, total }
  };
}

async function ejecutarConsultarEmpleados(
  args: { estado?: string; departamento?: string },
  companyId: string
) {
  const where: any = { companyId };
  if (args.estado === 'activos') where.status = 'ACTIVE';
  else if (args.estado === 'inactivos') where.status = 'INACTIVE';
  if (args.departamento) {
    where.department = { contains: args.departamento, mode: 'insensitive' };
  }

  const empleados = await prisma.employee.findMany({
    where,
    orderBy: { firstName: 'asc' },
    take: 50
  });

  const total = empleados.length;
  const totalSalarios = empleados.reduce((s, e) => s + e.salary, 0);
  const departamentos: Record<string, number> = {};
  empleados.forEach(e => {
    const dep = e.department || 'Sin departamento';
    departamentos[dep] = (departamentos[dep] || 0) + 1;
  });

  const lista = empleados.slice(0, 15).map(e =>
    `• ${e.firstName} ${e.lastName} — ${e.position} (${e.department || 'Sin dept.'}) — $${e.salary.toLocaleString()}/mes`
  ).join('\n');

  const depList = Object.entries(departamentos)
    .map(([dep, count]) => `${dep}: ${count}`)
    .join(', ');

  return {
    success: true,
    result: `👥 **EMPLEADOS** (${total} total)\n\n${lista}\n\n📊 Por departamento: ${depList}\n💰 Nómina total estimada: $${totalSalarios.toLocaleString()}/mes`,
    data: { total, totalSalarios, departamentos }
  };
}

async function ejecutarConsultarNomina(
  args: { periodo?: string; mes?: number; año?: number },
  companyId: string
) {
  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined = now;

  if (args.mes && args.año) {
    startDate = new Date(args.año, args.mes - 1, 1);
    endDate = new Date(args.año, args.mes, 0, 23, 59, 59);
  } else if (args.año) {
    startDate = new Date(args.año, 0, 1);
    endDate = new Date(args.año, 11, 31, 23, 59, 59);
  } else if (args.periodo === 'mes') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (args.periodo === 'año') {
    startDate = new Date(now.getFullYear(), 0, 1);
  }

  const where: any = { companyId };
  if (startDate) where.periodStart = { gte: startDate, lte: endDate };

  const payrolls = await prisma.payroll.findMany({
    where,
    include: { employee: true },
    orderBy: { periodStart: 'desc' },
    take: 50
  });

  const totalBruto = payrolls.reduce((s, p) => s + p.grossSalary, 0);
  const totalNeto = payrolls.reduce((s, p) => s + p.netSalary, 0);
  const totalDeducciones = payrolls.reduce((s, p) => s + p.deductions, 0);

  const lista = payrolls.slice(0, 10).map(p =>
    `• ${p.employee.firstName} ${p.employee.lastName}: Bruto $${p.grossSalary.toLocaleString()} → Neto $${p.netSalary.toLocaleString()} (${p.status})`
  ).join('\n');

  return {
    success: true,
    result: `💼 **NÓMINA** (${payrolls.length} registros)\n\n${lista}\n\n📊 **Resumen:**\n• Salario bruto total: $${totalBruto.toLocaleString()}\n• Deducciones: $${totalDeducciones.toLocaleString()}\n• Salario neto total: $${totalNeto.toLocaleString()}`,
    data: { count: payrolls.length, totalBruto, totalNeto, totalDeducciones }
  };
}

async function ejecutarConsultarProveedores(
  args: { estado?: string; nombre?: string },
  companyId: string
) {
  const whereVendor: any = { companyId };
  if (args.nombre) whereVendor.name = { contains: args.nombre, mode: 'insensitive' };

  const wherePayable: any = { companyId };
  if (args.estado === 'pendientes') wherePayable.status = 'UNPAID';
  else if (args.estado === 'vencidas') { wherePayable.status = 'UNPAID'; wherePayable.dueDate = { lt: new Date() }; }
  else if (args.estado === 'pagadas') wherePayable.status = 'PAID';

  const [vendors, payables] = await Promise.all([
    prisma.vendor.findMany({ where: whereVendor, take: 20, orderBy: { name: 'asc' } }),
    prisma.vendorPayable.findMany({ where: wherePayable, include: { vendor: true }, take: 30, orderBy: { dueDate: 'asc' } })
  ]);

  const totalDeuda = vendors.reduce((s, v) => s + v.currentBalance, 0);
  const totalPayables = payables.reduce((s, p) => s + p.balance, 0);

  const vendorList = vendors.slice(0, 10).map(v =>
    `• ${v.name} — Saldo: $${v.currentBalance.toLocaleString()} — ${v.status}`
  ).join('\n');

  const payableList = payables.slice(0, 10).map(p => {
    const vencida = p.dueDate < new Date() && p.status !== 'PAID' ? ' ⚠️ VENCIDA' : '';
    return `• ${p.vendor.name}: $${p.balance.toLocaleString()} — Vence: ${new Date(p.dueDate).toLocaleDateString('es')}${vencida}`;
  }).join('\n');

  return {
    success: true,
    result: `🏢 **PROVEEDORES** (${vendors.length} total)\n\n${vendorList}\n\n📄 **Cuentas por pagar** (${payables.length}):\n${payableList}\n\n💰 Total adeudado: $${totalDeuda.toLocaleString()}`,
    data: { vendors: vendors.length, totalDeuda, payables: payables.length, totalPayables }
  };
}

async function ejecutarConsultarInventario(
  args: { tipo?: string },
  companyId: string
) {
  const where: any = { companyId };
  if (args.tipo === 'bajo_minimo') {
    where.stock = { gt: 0 };
    where.reorderLevel = { not: null };
  } else if (args.tipo === 'sin_stock') {
    where.stock = { lte: 0 };
  } else if (args.tipo === 'activos') {
    where.status = 'ACTIVE';
  }

  const productos = await prisma.product.findMany({
    where,
    orderBy: { name: 'asc' },
    take: 50
  });

  const bajoMinimo = productos.filter(p =>
    p.reorderLevel !== null && p.stock !== null && p.stock <= p.reorderLevel
  );
  const sinStock = productos.filter(p => p.stock !== null && p.stock <= 0);
  const valorTotal = productos.reduce((s, p) => s + (p.cost || p.price) * (p.stock || 0), 0);

  const lista = productos.slice(0, 15).map(p => {
    const alerta = p.reorderLevel !== null && p.stock !== null && p.stock <= p.reorderLevel ? ' ⚠️' : '';
    return `• ${p.name} — Stock: ${p.stock ?? 'N/A'}${alerta} — Precio: $${p.price.toLocaleString()}`;
  }).join('\n');

  return {
    success: true,
    result: `📦 **INVENTARIO** (${productos.length} productos)\n\n${lista}\n\n📊 **Resumen:**\n• Productos bajo mínimo: ${bajoMinimo.length} ⚠️\n• Sin stock: ${sinStock.length}\n• Valor total inventario: $${valorTotal.toLocaleString()}`,
    data: { total: productos.length, bajoMinimo: bajoMinimo.length, sinStock: sinStock.length, valorTotal }
  };
}

async function ejecutarConsultarCuentasBancarias(
  args: { incluir_transacciones?: boolean },
  companyId: string
) {
  const cuentas = await prisma.bankAccount.findMany({
    where: { companyId },
    include: args.incluir_transacciones ? {
      bankTransactions: { orderBy: { date: 'desc' }, take: 5 }
    } : undefined,
    orderBy: { accountName: 'asc' }
  });

  const saldoTotal = cuentas.reduce((s, c) => s + c.balance, 0);

  const lista = cuentas.map(c => {
    let texto = `• ${c.accountName} (${c.accountType}) — Saldo: $${c.balance.toLocaleString()} — ${c.currency || 'USD'}`;
    if (args.incluir_transacciones && (c as any).bankTransactions?.length) {
      const txs = (c as any).bankTransactions.slice(0, 3).map((t: any) =>
        `    → ${t.description}: $${t.amount.toLocaleString()} (${new Date(t.date).toLocaleDateString('es')})`
      ).join('\n');
      texto += `\n${txs}`;
    }
    return texto;
  }).join('\n\n');

  return {
    success: true,
    result: `🏦 **CUENTAS BANCARIAS** (${cuentas.length} cuentas)\n\n${lista}\n\n💰 **Saldo total: $${saldoTotal.toLocaleString()}**`,
    data: { cuentas: cuentas.length, saldoTotal }
  };
}

async function ejecutarConsultarProyectos(
  args: { estado?: string },
  companyId: string
) {
  const where: any = { companyId };
  if (args.estado === 'activos') where.status = 'ACTIVE';
  else if (args.estado === 'completados') where.status = 'COMPLETED';

  const proyectos = await prisma.project.findMany({
    where,
    include: {
      tasks: { select: { id: true, status: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  const lista = proyectos.map(p => {
    const tareasTotales = p.tasks.length;
    const tareasCompletas = p.tasks.filter((t: any) => t.status === 'COMPLETED').length;
    const presupuesto = (p as any).budget ? `$${Number((p as any).budget).toLocaleString()}` : 'N/A';
    return `• ${p.name} — Estado: ${p.status} — Tareas: ${tareasCompletas}/${tareasTotales} — Presupuesto: ${presupuesto}`;
  }).join('\n');

  return {
    success: true,
    result: `📁 **PROYECTOS** (${proyectos.length} total)\n\n${lista || 'No hay proyectos registrados.'}`,
    data: { total: proyectos.length }
  };
}

async function ejecutarLlenarFormulariosFiscales(
  args: { year?: number },
  userId: string,
  companyId: string
) {
  const taxYear = args.year || (new Date().getFullYear() - 1);

  const data = await autoPopulateForm1040FromCompany(companyId, userId, taxYear);

  const scheduleC = data.scheduleC as any;
  const income = data.income;
  const payments = data.payments;
  const adjustments = data.adjustments;

  const grossReceipts = scheduleC?.grossReceipts || 0;
  const totalExpenses = scheduleC?.expenses || 0;
  const netProfit = scheduleC?.netProfit || 0;
  const wages = income?.wages || 0;
  const withholding = payments?.withholding || 0;
  const selfEmploymentTaxDeduction = adjustments?.total || 0;

  // Estimated self-employment tax (15.3% on 92.35% of net profit)
  const selfEmploymentTax = netProfit * 0.9235 * 0.153;
  const totalIncome = wages + netProfit;
  const agi = totalIncome - selfEmploymentTaxDeduction;

  const summary = `✅ **Form 1040 Auto-Completado — Año Fiscal ${taxYear}**

📊 **SCHEDULE C — Negocio/Self-Employment:**
• Ingresos brutos del negocio: $${grossReceipts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Gastos deducibles del negocio: $${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• **Utilidad neta (Línea 31):** $${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}

💼 **FORMULARIO 1040 — Ingresos:**
• Salarios W-2 (Línea 1): $${wages.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Ingreso Schedule C (Línea 8): $${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• **Ingreso Total (Línea 9):** $${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}

📉 **DEDUCCIONES Y AJUSTES:**
• Deducción ½ Self-Employment Tax: $${selfEmploymentTaxDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• **AGI (Línea 11):** $${agi.toLocaleString('en-US', { minimumFractionDigits: 2 })}

💸 **IMPUESTOS ESTIMADOS:**
• Self-Employment Tax (SE): $${selfEmploymentTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Retenciones federales (W-2): $${withholding.toLocaleString('en-US', { minimumFractionDigits: 2 })}

📋 Los datos han sido calculados con la información registrada en la aplicación. Ve a **Impuestos → Form 1040** para completar la información personal (SSN, nombre, dirección) y generar el formulario final.`;

  return {
    success: true,
    result: summary,
    data: {
      taxYear,
      grossReceipts,
      totalExpenses,
      netProfit,
      wages,
      totalIncome,
      agi,
      selfEmploymentTax,
      withholding
    }
  };
}
