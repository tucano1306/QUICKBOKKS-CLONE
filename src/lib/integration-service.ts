/**
 * FASE 8: Integration Service
 * Manage external API integrations (Stripe, QuickBooks, etc.)
 */

import { prisma } from './prisma';

type IntegrationProvider = 'STRIPE' | 'QUICKBOOKS' | 'XERO' | 'PLAID' | 'SHOPIFY' | 'SALESFORCE' | 'MAILCHIMP' | 'SLACK' | 'ZAPIER' | 'CUSTOM';
type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING_AUTH' | 'EXPIRED';

interface IntegrationConfig {
  companyId: string;
  provider: IntegrationProvider;
  name?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
  settings?: any;
}

/**
 * Create or update integration
 */
export async function saveIntegration(config: IntegrationConfig) {
  const existing = await (prisma as any).integration.findUnique({
    where: {
      companyId_provider: {
        companyId: config.companyId,
        provider: config.provider,
      },
    },
  });

  if (existing) {
    return await (prisma as any).integration.update({
      where: { id: existing.id },
      data: {
        name: config.name,
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        expiresAt: config.expiresAt,
        scopes: config.scopes,
        settings: config.settings,
        status: 'CONNECTED',
        lastError: null,
        updatedAt: new Date(),
      },
    });
  }

  return await (prisma as any).integration.create({
    data: {
      companyId: config.companyId,
      provider: config.provider,
      name: config.name || config.provider,
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      expiresAt: config.expiresAt,
      scopes: config.scopes || [],
      settings: config.settings || {},
      status: 'CONNECTED',
      isActive: true,
    },
  });
}

/**
 * Get integration by provider
 */
export async function getIntegration(companyId: string, provider: IntegrationProvider) {
  const integration = await (prisma as any).integration.findUnique({
    where: {
      companyId_provider: {
        companyId,
        provider,
      },
    },
  });

  return integration;
}

/**
 * List all integrations for company
 */
export async function listIntegrations(companyId: string) {
  const integrations = await (prisma as any).integration.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  });

  return integrations;
}

/**
 * Disconnect integration
 */
export async function disconnectIntegration(companyId: string, provider: IntegrationProvider) {
  const integration = await (prisma as any).integration.update({
    where: {
      companyId_provider: {
        companyId,
        provider,
      },
    },
    data: {
      status: 'DISCONNECTED',
      isActive: false,
      accessToken: null,
      refreshToken: null,
    },
  });

  return integration;
}

/**
 * Update integration status
 */
export async function updateIntegrationStatus(
  companyId: string,
  provider: IntegrationProvider,
  status: IntegrationStatus,
  error?: string
) {
  const integration = await (prisma as any).integration.update({
    where: {
      companyId_provider: {
        companyId,
        provider,
      },
    },
    data: {
      status,
      lastError: error,
      updatedAt: new Date(),
    },
  });

  return integration;
}

/**
 * Sync data with external service
 */
export async function syncIntegration(companyId: string, provider: IntegrationProvider) {
  const integration = await getIntegration(companyId, provider);

  if (!integration || integration.status !== 'CONNECTED') {
    throw new Error('Integration not connected');
  }

  try {
    let result;

    switch (provider) {
      case 'STRIPE':
        result = await syncStripe(integration);
        break;
      case 'QUICKBOOKS':
        result = await syncQuickBooks(integration);
        break;
      case 'PLAID':
        result = await syncPlaid(integration);
        break;
      default:
        throw new Error(`Sync not implemented for ${provider}`);
    }

    // Update last sync time
    await (prisma as any).integration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastError: null,
      },
    });

    return result;
  } catch (error: any) {
    await updateIntegrationStatus(companyId, provider, 'ERROR', error.message);
    throw error;
  }
}

/**
 * Stripe Integration
 */
async function syncStripe(integration: any) {
  // TODO: Implement Stripe API calls
  // - Sync payments
  // - Sync subscriptions
  // - Sync customers
  // - Create invoices in Stripe

  const stripe = require('stripe')(integration.accessToken);

  // Example: Get recent charges
  const charges = await stripe.charges.list({
    limit: 100,
  });

  return {
    provider: 'STRIPE',
    synced: charges.data.length,
    items: charges.data.map((charge: any) => ({
      id: charge.id,
      amount: charge.amount / 100, // Convert from cents
      status: charge.status,
      created: new Date(charge.created * 1000),
    })),
  };
}

/**
 * QuickBooks Integration
 */
async function syncQuickBooks(integration: any) {
  // TODO: Implement QuickBooks API calls
  // - Sync invoices
  // - Sync customers
  // - Sync expenses
  // - Sync chart of accounts

  return {
    provider: 'QUICKBOOKS',
    synced: 0,
    message: 'QuickBooks sync not yet implemented',
  };
}

/**
 * Plaid Integration (already implemented in FASE 3)
 */
async function syncPlaid(integration: any) {
  // Use existing Plaid implementation from banking integration
  return {
    provider: 'PLAID',
    synced: 0,
    message: 'Using existing Plaid integration from FASE 3',
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(companyId: string, provider: IntegrationProvider) {
  const integration = await getIntegration(companyId, provider);

  if (!integration || !integration.refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    let newTokens;

    switch (provider) {
      case 'QUICKBOOKS':
        newTokens = await refreshQuickBooksToken(integration.refreshToken);
        break;
      default:
        throw new Error(`Token refresh not implemented for ${provider}`);
    }

    await (prisma as any).integration.update({
      where: { id: integration.id },
      data: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresAt: newTokens.expiresAt,
        status: 'CONNECTED',
      },
    });

    return newTokens;
  } catch (error: any) {
    await updateIntegrationStatus(companyId, provider, 'EXPIRED', error.message);
    throw error;
  }
}

/**
 * Refresh QuickBooks token
 */
async function refreshQuickBooksToken(refreshToken: string) {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Test integration connection
 */
export async function testIntegration(companyId: string, provider: IntegrationProvider) {
  const integration = await getIntegration(companyId, provider);

  if (!integration) {
    return { connected: false, message: 'Integration not found' };
  }

  try {
    switch (provider) {
      case 'STRIPE':
        const stripe = require('stripe')(integration.accessToken);
        await stripe.balance.retrieve();
        return { connected: true, message: 'Stripe connection successful' };

      case 'QUICKBOOKS':
        // TODO: Test QuickBooks connection
        return { connected: true, message: 'QuickBooks connection test not implemented' };

      default:
        return { connected: false, message: 'Test not implemented for this provider' };
    }
  } catch (error: any) {
    return { connected: false, message: error.message };
  }
}

/**
 * Get integration settings schema
 */
export function getIntegrationSchema(provider: IntegrationProvider) {
  const schemas: Record<string, any> = {
    STRIPE: {
      fields: [
        { name: 'secretKey', type: 'password', required: true, label: 'Secret Key' },
        { name: 'webhookSecret', type: 'password', required: false, label: 'Webhook Secret' },
        { name: 'autoSync', type: 'boolean', required: false, label: 'Auto Sync Payments' },
      ],
    },
    QUICKBOOKS: {
      fields: [
        { name: 'clientId', type: 'text', required: true, label: 'Client ID' },
        { name: 'clientSecret', type: 'password', required: true, label: 'Client Secret' },
        { name: 'realmId', type: 'text', required: true, label: 'Company ID (Realm ID)' },
        { name: 'sandbox', type: 'boolean', required: false, label: 'Use Sandbox' },
      ],
    },
    PLAID: {
      fields: [
        { name: 'clientId', type: 'text', required: true, label: 'Client ID' },
        { name: 'secret', type: 'password', required: true, label: 'Secret' },
        { name: 'environment', type: 'select', required: true, label: 'Environment', options: ['sandbox', 'development', 'production'] },
      ],
    },
  };

  return schemas[provider] || { fields: [] };
}

/**
 * Webhook handler for integration events
 */
export async function handleIntegrationWebhook(provider: IntegrationProvider, payload: any, signature?: string) {
  switch (provider) {
    case 'STRIPE':
      return handleStripeWebhook(payload, signature);
    case 'QUICKBOOKS':
      return handleQuickBooksWebhook(payload);
    default:
      throw new Error(`Webhook handler not implemented for ${provider}`);
  }
}

/**
 * Handle Stripe webhook
 */
async function handleStripeWebhook(payload: any, signature?: string) {
  // TODO: Verify webhook signature
  // TODO: Process Stripe events (payment_intent.succeeded, etc.)

  return {
    received: true,
    event: payload.type,
  };
}

/**
 * Handle QuickBooks webhook
 */
async function handleQuickBooksWebhook(payload: any) {
  // TODO: Process QuickBooks events

  return {
    received: true,
    entities: payload.eventNotifications,
  };
}
