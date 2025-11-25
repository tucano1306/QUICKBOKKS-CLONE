-- Manual Multi-Tenant Migration Script
-- Run this directly in PostgreSQL before applying Prisma migration

-- Step 1: Ensure default company exists
INSERT INTO companies (id, name, "legalName", "taxId", industry, country, state, "isActive", subscription, "createdAt", "updatedAt")
VALUES ('default-company-001', 'Legacy Company', 'Legacy Company LLC', '00-0000000', 'General', 'US', 'FL', true, 'PROFESSIONAL', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Step 2: Add companyId columns with default value
ALTER TABLE customers ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE products ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE payroll_deductions ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE tax_returns ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE tax_config ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';

-- Add to all other tables that might have data
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE bank_reconciliations ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE reconciliation_rules ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE reconciliation_matches ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE budget_periods ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE asset_depreciations ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE tax_withholdings ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE inventory_valuations ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE inventory_adjustments ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE aging_reports ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE payment_reminders ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE financial_statements ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE cash_flow_projections ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE e_invoices ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE sales_tax_rates ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';
ALTER TABLE tax_exemptions ADD COLUMN IF NOT EXISTS "companyId" TEXT DEFAULT 'default-company-001';

-- Step 3: Remove defaults (Prisma will handle NOT NULL constraint)
ALTER TABLE customers ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE products ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE employees ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE expense_categories ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE invoices ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE invoice_items ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE payments ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE expenses ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE transactions ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE payrolls ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE payroll_deductions ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE tax_returns ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE tax_config ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE bank_accounts ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE bank_transactions ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE bank_reconciliations ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE reconciliation_rules ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE reconciliation_matches ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE chart_of_accounts ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE journal_entries ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE journal_entry_lines ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE budgets ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE budget_periods ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE assets ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE asset_depreciations ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE currencies ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE exchange_rates ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE cost_centers ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE tax_withholdings ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE inventory_valuations ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE inventory_adjustments ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE aging_reports ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE payment_reminders ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE credit_notes ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE financial_statements ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE cash_flow_projections ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE audit_logs ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE e_invoices ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE sales_tax_rates ALTER COLUMN "companyId" DROP DEFAULT;
ALTER TABLE tax_exemptions ALTER COLUMN "companyId" DROP DEFAULT;

-- Step 4: Verification
SELECT 'customers' as table_name, COUNT(*) as total, COUNT("companyId") as with_company FROM customers
UNION ALL
SELECT 'products', COUNT(*), COUNT("companyId") FROM products
UNION ALL
SELECT 'employees', COUNT(*), COUNT("companyId") FROM employees
UNION ALL
SELECT 'invoices', COUNT(*), COUNT("companyId") FROM invoices;

-- If all looks good, Prisma migrate can now add constraints and foreign keys
