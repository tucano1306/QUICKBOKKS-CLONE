// Main Components Index
// 
// Component Structure:
// - shared/: Reusable components used across the entire application
//   - ui/: Basic UI elements (buttons, inputs, cards, tables)
//   - layout/: Navigation, sidebars, and structural layouts
//
// - dashboard/: CRM dashboard components (add as needed)
//
// - banking/: Banking integration components (Plaid)
// - ai-assistant/: AI chat and assistant components

// Re-export from shared (backwards compatibility)
export * from './shared'

// Feature-specific exports
export { BankConnectionManager } from './banking/plaid-link'
export { default as FloatingAssistant } from './ai-assistant/floating-assistant'

// Context and providers
export { Providers } from './providers'
export { default as CompanySelector } from './CompanySelector'
