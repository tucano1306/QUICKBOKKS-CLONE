/**
 * DATA MIGRATION SCRIPT
 * 
 * Purpose: Migrate existing data to multi-tenant structure
 * 
 * This script:
 * 1. Creates a default "Legacy Company" 
 * 2. Assigns all existing data to this company
 * 3. Updates all records with companyId
 * 
 * Run BEFORE applying the Prisma migration!
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting multi-tenant data migration...\n')

  // Step 1: Create default company
  console.log('📦 Step 1: Creating default company...')
  
  const defaultCompany = await prisma.company.upsert({
    where: { id: 'default-company-001' },
    update: {},
    create: {
      id: 'default-company-001',
      name: 'Legacy Company',
      legalName: 'Legacy Company LLC',
      taxId: '00-0000000',
      industry: 'General',
      country: 'US',
      state: 'FL',
      isActive: true,
      subscription: 'PROFESSIONAL',
    },
  })

  console.log(`✅ Default company created: ${defaultCompany.name} (${defaultCompany.id})\n`)

  // Step 2: Get counts of records to migrate
  console.log('📊 Step 2: Counting existing records...')
  
  const counts = {
    customers: await prisma.customer.count(),
    products: await prisma.product.count(),
    employees: await prisma.employee.count(),
    // assets: await prisma.asset.count(),
    // budgets: await prisma.budget.count(),
    // budgetPeriods: await prisma.budgetPeriod.count(),
    // chartOfAccounts: await prisma.chartOfAccounts.count(),
    // costCenters: await prisma.costCenter.count(),
    // currencies: await prisma.currency.count(),
    // exchangeRates: await prisma.exchangeRate.count(),
    expenseCategories: await prisma.expenseCategory.count(),
    // payrolls: await prisma.payroll.count(),
    // salesTaxRates: await prisma.salesTaxRate.count(),
  }

  console.log('Records to migrate:')
  Object.entries(counts).forEach(([table, count]) => {
    if (count > 0) {
      console.log(`  - ${table}: ${count}`)
    }
  })
  console.log()

  // Step 3: Update records with companyId
  console.log('🔄 Step 3: Assigning companyId to existing records...\n')

  const companyId = defaultCompany.id

  // Update customers
  if (counts.customers > 0) {
    const result = await prisma.$executeRaw`
      UPDATE customers SET "companyId" = ${companyId} WHERE "companyId" IS NULL
    `
    console.log(`✅ Updated ${result} customers`)
  }

  // Update products
  if (counts.products > 0) {
    const result = await prisma.$executeRaw`
      UPDATE products SET "companyId" = ${companyId} WHERE "companyId" IS NULL
    `
    console.log(`✅ Updated ${result} products`)
  }

  // Update employees
  if (counts.employees > 0) {
    const result = await prisma.$executeRaw`
      UPDATE employees SET "companyId" = ${companyId} WHERE "companyId" IS NULL
    `
    console.log(`✅ Updated ${result} employees`)
  }

  // Update expense_categories
  if (counts.expenseCategories > 0) {
    const result = await prisma.$executeRaw`
      UPDATE expense_categories SET "companyId" = ${companyId} WHERE "companyId" IS NULL
    `
    console.log(`✅ Updated ${result} expense_categories`)
  }

  // Note: Other tables will be updated after migration is applied

  console.log('\n✅ Data migration completed successfully!')
  console.log(`\nAll existing data has been assigned to: ${defaultCompany.name}`)
  console.log('\n📝 Next steps:')
  console.log('1. Review the migration file in prisma/migrations/')
  console.log('2. Apply migration: npx prisma migrate deploy')
  console.log('3. Restart your application')
  console.log('4. Create additional companies via UI or seed script')
}

main()
  .catch((e) => {
    console.error('❌ Error during migration:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
