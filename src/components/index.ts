// Main Components Index
//
// Component Structure:
// - ui/: Basic UI elements (buttons, inputs, cards, tables)
// - layout/: Navigation, sidebars, and structural layouts
//
// - ai-assistant/: AI chat and assistant components
// - banking/: Banking integration components (Plaid)
// - dashboard/: CRM dashboard components
// - documents/: Document upload and review
// - taxes/: Tax forms and estimates
// - transactions/: Transaction entry and editing
// - vehicles/: Vehicle economics (book / market / total cost)

// Feature-specific exports
export { BankConnectionManager } from './banking/plaid-link'


// Context and providers
export { default as CompanySelector } from './CompanySelector'
export { Providers } from './providers'
