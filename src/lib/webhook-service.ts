/**
 * FASE 8: Webhook Service
 * Manage and deliver webhooks to external systems
 */

import { prisma } from './prisma';
import crypto from 'crypto';

interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  companyId: string;
}

/**
 * Create a webhook endpoint
 */
export async function createWebhook(data: {
  companyId: string;
  url: string;
  events: string[];
  secret?: string;
}) {
  const secret = data.secret || crypto.randomBytes(32).toString('hex');

  const webhook = await (prisma as any).webhook.create({
    data: {
      companyId: data.companyId,
      url: data.url,
      events: data.events,
      secret,
      isActive: true,
      retryCount: 3,
      timeout: 30,
    },
  });

  return webhook;
}

/**
 * Trigger webhooks for an event
 */
export async function triggerWebhook(companyId: string, event: string, data: any) {
  // Find all active webhooks listening to this event
  const webhooks = await (prisma as any).webhook.findMany({
    where: {
      companyId,
      isActive: true,
      events: {
        has: event,
      },
    },
  });

  if (webhooks.length === 0) {
    return { delivered: 0, failed: 0 };
  }

  const payload: WebhookPayload = {
    event,
    data,
    timestamp: new Date().toISOString(),
    companyId,
  };

  let delivered = 0;
  let failed = 0;

  // Deliver to each webhook
  for (const webhook of webhooks) {
    const success = await deliverWebhook(webhook, payload);
    if (success) {
      delivered++;
    } else {
      failed++;
    }
  }

  return { delivered, failed };
}

/**
 * Deliver webhook to a single endpoint
 */
async function deliverWebhook(webhook: any, payload: WebhookPayload, attempt: number = 1): Promise<boolean> {
  try {
    // Generate signature
    const signature = generateSignature(payload, webhook.secret);

    // Send webhook
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), webhook.timeout * 1000);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Log the delivery
    await (prisma as any).webhookLog.create({
      data: {
        webhookId: webhook.id,
        event: payload.event,
        payload: payload.data,
        statusCode: response.status,
        response: await response.text(),
        attempts: attempt,
        deliveredAt: response.ok ? new Date() : null,
      },
    });

    return response.ok;
  } catch (error: any) {
    // Log failed delivery
    await (prisma as any).webhookLog.create({
      data: {
        webhookId: webhook.id,
        event: payload.event,
        payload: payload.data,
        error: error.message,
        attempts: attempt,
      },
    });

    // Retry if not exceeded retry count
    if (attempt < webhook.retryCount) {
      // Exponential backoff: 2^attempt seconds
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      return deliverWebhook(webhook, payload, attempt + 1);
    }

    return false;
  }
}

/**
 * Generate HMAC signature for webhook verification
 */
function generateSignature(payload: WebhookPayload, secret: string): string {
  const data = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Get webhook logs
 */
export async function getWebhookLogs(webhookId: string, limit: number = 100) {
  const logs = await (prisma as any).webhookLog.findMany({
    where: { webhookId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs;
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats(webhookId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await (prisma as any).webhookLog.findMany({
    where: {
      webhookId,
      createdAt: { gte: startDate },
    },
  });

  const total = logs.length;
  const successful = logs.filter((log: any) => log.statusCode && log.statusCode < 400).length;
  const failed = logs.filter((log: any) => !log.statusCode || log.statusCode >= 400).length;

  // Average response time
  const deliveredLogs = logs.filter((log: any) => log.deliveredAt);
  const avgResponseTime = deliveredLogs.length > 0
    ? deliveredLogs.reduce((sum: number, log: any) => {
        const diff = new Date(log.deliveredAt).getTime() - new Date(log.createdAt).getTime();
        return sum + diff;
      }, 0) / deliveredLogs.length
    : 0;

  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    avgResponseTime: Math.round(avgResponseTime),
  };
}

/**
 * Update webhook
 */
export async function updateWebhook(webhookId: string, data: {
  url?: string;
  events?: string[];
  isActive?: boolean;
}) {
  const webhook = await (prisma as any).webhook.update({
    where: { id: webhookId },
    data,
  });

  return webhook;
}

/**
 * Delete webhook
 */
export async function deleteWebhook(webhookId: string) {
  await (prisma as any).webhook.delete({
    where: { id: webhookId },
  });

  return { success: true };
}

/**
 * Test webhook endpoint
 */
export async function testWebhook(webhookId: string) {
  const webhook = await (prisma as any).webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  const testPayload: WebhookPayload = {
    event: 'test',
    data: {
      message: 'This is a test webhook delivery',
      webhookId: webhook.id,
    },
    timestamp: new Date().toISOString(),
    companyId: webhook.companyId,
  };

  const success = await deliverWebhook(webhook, testPayload);

  return { success, message: success ? 'Test successful' : 'Test failed' };
}

/**
 * List all webhooks for a company
 */
export async function listWebhooks(companyId: string) {
  const webhooks = await (prisma as any).webhook.findMany({
    where: { companyId },
    include: {
      _count: {
        select: { logs: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return webhooks;
}

/**
 * Webhook event types
 */
export const WEBHOOK_EVENTS = {
  // Invoice events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_UPDATED: 'invoice.updated',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_CANCELLED: 'invoice.cancelled',
  INVOICE_OVERDUE: 'invoice.overdue',

  // Customer events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',

  // Payment events
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',

  // Expense events
  EXPENSE_CREATED: 'expense.created',
  EXPENSE_APPROVED: 'expense.approved',

  // Employee events
  EMPLOYEE_CREATED: 'employee.created',
  PAYROLL_PROCESSED: 'payroll.processed',

  // System events
  BACKUP_COMPLETED: 'backup.completed',
  INTEGRATION_CONNECTED: 'integration.connected',
  INTEGRATION_FAILED: 'integration.failed',
};
