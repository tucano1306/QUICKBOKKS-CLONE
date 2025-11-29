// Main Components Index
// 
// Component Structure:
// - shared/: Reusable components used across the entire application
//   - ui/: Basic UI elements (buttons, inputs, cards, tables)
//   - layout/: Navigation, sidebars, and structural layouts
//   - modals/: Confirmation dialogs and alert modals
//
// - dashboard/: CRM dashboard components
//   - cards/: Stats cards, action cards, activity feeds
//   - tables/: Data tables and list views
//   - modals/: Slide-overs and dashboard-specific dialogs
//
// - banking/: Banking integration components (Plaid)
// - ai-assistant/: AI chat and assistant components

// Re-export from shared (backwards compatibility)
export * from './shared'

// Dashboard-specific components
export * from './dashboard'

// Feature-specific exports
export { BankConnectionManager } from './banking/plaid-link'
export { default as FloatingAssistant } from './ai-assistant/floating-assistant'

// Context and providers
export { Providers } from './providers'
export { default as CompanySelector } from './CompanySelector'
