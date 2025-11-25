/**
 * CLIENT PORTAL SERVICE
 * 
 * Sistema de portal para clientes con:
 * - Autenticación independiente para clientes
 * - Vista de facturas y estados de cuenta
 * - Subida de documentos (recibos, contratos)
 * - Auto-categorización de documentos con ML
 * - Notificaciones y mensajes
 */

import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { predictExpenseCategory } from './ml-categorization-service';

export interface ClientPortalUser {
  id: string;
  customerId: string;
  email: string;
  name: string;
  companyName?: string;
  lastLogin?: Date;
  isActive: boolean;
}

export interface ClientDocument {
  id: string;
  customerId: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
  category?: string;
  autoCategorizationConfidence?: number;
}

export interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  total: number;
  paid: number;
  balance: number;
  status: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

export interface ClientStatement {
  customerId: string;
  customerName: string;
  companyName: string;
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  closingBalance: number;
  invoices: Array<{
    date: Date;
    invoiceNumber: string;
    description: string;
    amount: number;
    payment: number;
    balance: number;
  }>;
}

/**
 * Crear acceso al portal para un cliente
 */
export async function createClientPortalAccess(
  customerId: string,
  email: string,
  password: string
) {
  // Verificar que el cliente existe
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new Error('Cliente no encontrado');
  }

  // Verificar si ya tiene acceso
  if (customer.portalActive && customer.portalPassword) {
    throw new Error('El cliente ya tiene acceso al portal');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Actualizar cliente con acceso al portal
  const updatedCustomer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      email, // Actualizar email si es necesario
      portalPassword: hashedPassword,
      portalActive: true,
    },
  });

  // Enviar email de bienvenida (implementar con servicio de email)
  // await sendWelcomeEmail(email, customer.name);

  return {
    id: updatedCustomer.id,
    email: updatedCustomer.email || email,
    customerId: updatedCustomer.id,
  };
}

/**
 * Autenticar cliente en el portal
 */
export async function authenticateClientPortal(
  email: string,
  password: string
): Promise<ClientPortalUser | null> {
  console.log('🔍 Attempting portal login for:', email);
  
  const customer = await prisma.customer.findFirst({
    where: { 
      email,
      portalActive: true,
    },
  });

  if (!customer) {
    console.log('❌ Customer not found or portal not active');
    return null;
  }

  if (!customer.portalPassword) {
    console.log('❌ Customer has no portal password set');
    return null;
  }

  console.log('🔐 Verifying password...');
  const isValid = await bcrypt.compare(password, customer.portalPassword);

  if (!isValid) {
    console.log('❌ Invalid password');
    return null;
  }

  console.log('✅ Login successful');


  // Actualizar último login
  await prisma.customer.update({
    where: { id: customer.id },
    data: { portalLastLogin: new Date() },
  });

  return {
    id: customer.id,
    customerId: customer.id,
    email: customer.email || '',
    name: customer.name,
    companyName: customer.company || undefined,
    lastLogin: new Date(),
    isActive: customer.portalActive,
  };
}

/**
 * Obtener facturas del cliente
 */
export async function getClientInvoices(
  customerId: string,
  options: {
    status?: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
): Promise<ClientInvoice[]> {
  const where: any = { customerId };

  if (options.status) {
    where.status = options.status;
  }

  if (options.startDate || options.endDate) {
    where.date = {};
    if (options.startDate) where.date.gte = options.startDate;
    if (options.endDate) where.date.lte = options.endDate;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      items: true,
      payments: true,
    },
    orderBy: { dueDate: 'desc' },
    take: options.limit || 100,
  });

  return invoices.map((invoice) => {
    const paidAmount = invoice.payments.reduce(
      (sum, payment) => sum + parseFloat(payment.amount.toString()),
      0
    );
    const total = parseFloat(invoice.total.toString());
    const balance = total - paidAmount;
    
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.dueDate,
      dueDate: invoice.dueDate,
      total,
      paid: paidAmount,
      balance,
      status: invoice.status,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        price: parseFloat(item.unitPrice.toString()),
        total: parseFloat(item.total.toString()),
      })),
    };
  });
}

/**
 * Generar estado de cuenta del cliente
 */
export async function generateClientStatement(
  customerId: string,
  startDate: Date,
  endDate: Date
): Promise<ClientStatement> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new Error('Cliente no encontrado');
  }

  // Obtener facturas del período
  const invoices = await prisma.invoice.findMany({
    where: {
      customerId,
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      payments: true,
    },
    orderBy: { dueDate: 'asc' },
  });

  // Calcular saldo inicial (facturas anteriores no pagadas)
  const priorInvoices = await prisma.invoice.findMany({
    where: {
      customerId,
      dueDate: { lt: startDate },
      status: { in: ['SENT', 'OVERDUE'] },
    },
    include: {
      payments: true,
    },
  });

  const openingBalance = priorInvoices.reduce(
    (sum, inv) => {
      const total = parseFloat(inv.total.toString());
      const paid = inv.payments.reduce(
        (paidSum, payment) => paidSum + parseFloat(payment.amount.toString()),
        0
      );
      return sum + (total - paid);
    },
    0
  );

  // Calcular totales
  let totalInvoiced = 0;
  let totalPaid = 0;
  let runningBalance = openingBalance;

  const statementLines = invoices.map((invoice) => {
    const amount = parseFloat(invoice.total.toString());
    const payment = invoice.payments.reduce(
      (sum, p) => sum + parseFloat(p.amount.toString()),
      0
    );

    totalInvoiced += amount;
    totalPaid += payment;
    runningBalance += amount - payment;

    return {
      date: invoice.dueDate,
      invoiceNumber: invoice.invoiceNumber,
      description: `Invoice #${invoice.invoiceNumber}`,
      amount,
      payment,
      balance: runningBalance,
    };
  });

  return {
    customerId,
    customerName: customer.name,
    companyName: customer.company || 'N/A',
    periodStart: startDate,
    periodEnd: endDate,
    openingBalance,
    totalInvoiced,
    totalPaid,
    closingBalance: runningBalance,
    invoices: statementLines,
  };
}

/**
 * Subir documento al portal (con upload a storage)
 */
export async function uploadClientDocument(
  customerId: string,
  file: {
    name: string;
    type: string;
    size: number;
    buffer: Buffer;
  },
  companyId: string
): Promise<ClientDocument> {
  throw new Error('Client portal feature not available - missing models in schema');
  return null as any;
  
  // En producción, subir a S3/CloudFlare/Azure Blob
  // Por ahora simulamos con URL local
  const fileId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const fileUrl = `/uploads/client-documents/${customerId}/${fileId}`;

  // Crear registro en base de datos
  // @ts-expect-error - Model not in schema
  const document = await prisma.clientDocument.create({
    data: {
      customerId,
      name: file.name,
      type: file.type,
      size: file.size,
      url: fileUrl,
      uploadedAt: new Date(),
    },
  });

  // Si es una imagen/PDF de recibo, intentar auto-categorización
  if (
    file.type.includes('image') ||
    file.type.includes('pdf') ||
    file.name.toLowerCase().includes('receipt') ||
    file.name.toLowerCase().includes('invoice')
  ) {
    try {
      // Extraer texto con OCR (implementar con Tesseract.js o Google Vision)
      // const extractedText = await extractTextFromImage(file.buffer);

      // Simular texto extraído para ejemplo
      const extractedText = `Receipt from ${file.name}`;

      // Predecir categoría
      const prediction = await predictExpenseCategory(companyId, {
        description: extractedText,
        amount: 0, // Idealmente extraer monto del recibo
        date: new Date(),
      });

      // Actualizar documento con categoría sugerida
      // @ts-expect-error - Model not in schema
      await prisma.clientDocument.update({
        where: { id: document.id },
        data: {
          suggestedCategory: prediction.category,
          categorizationConfidence: prediction.confidence,
        },
      });

      return {
        id: document.id,
        customerId: document.customerId,
        name: document.name,
        type: document.type,
        size: document.size,
        url: document.url,
        uploadedAt: document.uploadedAt,
        category: prediction.category,
        autoCategorizationConfidence: prediction.confidence,
      };
    } catch (error) {
      console.error('Error auto-categorizando documento:', error);
    }
  }

  return {
    id: document.id,
    customerId: document.customerId,
    name: document.name,
    type: document.type,
    size: document.size,
    url: document.url,
    uploadedAt: document.uploadedAt,
  };
}

/**
 * Obtener documentos del cliente
 */
export async function getClientDocuments(
  customerId: string,
  options: {
    type?: string;
    limit?: number;
  } = {}
): Promise<ClientDocument[]> {
  throw new Error('Client portal feature not available - missing models in schema');
  return [];
  
  const where: any = { customerId };

  if (options.type) {
    where.type = { contains: options.type };
  }

  // @ts-expect-error - Model not in schema
  const documents = await prisma.clientDocument.findMany({
    where,
    orderBy: { uploadedAt: 'desc' },
    take: options.limit || 100,
  });

  return documents.map((doc) => ({
    id: doc.id,
    customerId: doc.customerId,
    name: doc.name,
    type: doc.type,
    size: doc.size,
    url: doc.url,
    uploadedAt: doc.uploadedAt,
    category: doc.suggestedCategory || undefined,
    autoCategorizationConfidence: doc.categorizationConfidence || undefined,
  }));
}

/**
 * Obtener estadísticas del cliente
 */
export async function getClientDashboardStats(customerId: string) {
  const [
    totalInvoices,
    paidInvoices,
    pendingInvoices,
    overdueInvoices,
    totalSpent,
    documents,
  ] = await Promise.all([
    prisma.invoice.count({ where: { customerId } }),
    prisma.invoice.count({ where: { customerId, status: 'PAID' } }),
    prisma.invoice.count({ where: { customerId, status: 'SENT' } }),
    prisma.invoice.count({ where: { customerId, status: 'OVERDUE' } }),
    prisma.invoice.aggregate({
      where: { customerId, status: 'PAID' },
      _sum: { total: true },
    }),
    0, // documents count placeholder
  ]);

  // Calculate balance from unpaid invoices
  const unpaidInvoices = await prisma.invoice.findMany({
    where: { customerId, status: { in: ['SENT', 'OVERDUE'] } },
    include: { payments: true },
  });

  const currentBalance = unpaidInvoices.reduce((sum, invoice) => {
    const total = parseFloat(invoice.total.toString());
    const paid = invoice.payments.reduce(
      (paidSum, payment) => paidSum + parseFloat(payment.amount.toString()),
      0
    );
    return sum + (total - paid);
  }, 0);

  return {
    totalInvoices,
    paidInvoices,
    pendingInvoices,
    overdueInvoices,
    totalSpent: parseFloat(totalSpent._sum.total?.toString() || '0'),
    currentBalance,
    documentsCount: documents,
  };
}

/**
 * Crear mensaje/notificación para cliente
 */
export async function sendClientMessage(
  customerId: string,
  companyId: string,
  subject: string,
  message: string,
  priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
) {
  throw new Error('Client portal feature not available - missing models in schema');
  return null as any;
  
  // @ts-expect-error - Model not in schema
  const notification = await prisma.clientNotification.create({
    data: {
      customerId,
      companyId,
      subject,
      message,
      priority,
      isRead: false,
      createdAt: new Date(),
    },
  });

  // Enviar email (implementar con servicio de email)
  // await sendEmailNotification(customer.email, subject, message);

  return notification;
}

/**
 * Obtener notificaciones del cliente
 */
export async function getClientNotifications(
  customerId: string,
  unreadOnly = false
) {
  throw new Error('Client portal feature not available - missing models in schema');
  return [];
  
  const where: any = { customerId };

  if (unreadOnly) {
    where.isRead = false;
  }

  // @ts-expect-error - Model not in schema
  return prisma.clientNotification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

/**
 * Marcar notificación como leída
 */
export async function markNotificationAsRead(notificationId: string) {
  throw new Error('Client portal feature not available - missing models in schema');
  return null as any;
  
  // @ts-expect-error - Model not in schema
  return prisma.clientNotification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}

/**
 * Cambiar contraseña del portal
 */
export async function changeClientPortalPassword(
  customerId: string,
  oldPassword: string,
  newPassword: string
) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer || !customer.portalPassword) {
    throw new Error('Usuario del portal no encontrado');
  }

  const isValid = await bcrypt.compare(oldPassword, customer.portalPassword);

  if (!isValid) {
    throw new Error('Contraseña actual incorrecta');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.customer.update({
    where: { id: customerId },
    data: { portalPassword: hashedPassword },
  });

  return { success: true };
}

/**
 * Desactivar acceso al portal
 */
export async function deactivateClientPortalAccess(customerId: string) {
  throw new Error('Client portal feature not available - missing models in schema');
  return { success: false };
  
  // @ts-expect-error - Model not in schema
  const portalUser = await prisma.clientPortalUser.findFirst({
    where: { customerId },
  });

  if (!portalUser) {
    throw new Error('Usuario del portal no encontrado');
  }

  // @ts-expect-error - Model not in schema
  await prisma.clientPortalUser.update({
    where: { id: portalUser.id },
    data: { isActive: false },
  });

  return { success: true };
}
