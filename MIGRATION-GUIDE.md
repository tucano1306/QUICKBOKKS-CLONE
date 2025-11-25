# 🚀 Multi-Tenant Migration Guide

## ⚠️ CRITICAL: Read Before Executing

This guide explains how to safely migrate your QuickBooks clone from single-tenant to multi-tenant architecture.

---

## 📋 Pre-Migration Checklist

### 1. Backup Database
```bash
# PostgreSQL backup
pg_dump -h localhost -U postgres -d quickbooks_db > backup_before_multitenant.sql

# Or use pgAdmin to create a full backup
```

### 2. Verify Current State
```bash
# Check schema is valid
npx prisma validate

# Check current data counts
npx prisma studio
# Verify number of customers, products, employees, etc.
```

### 3. Ensure No Active Users
- Put application in maintenance mode
- Ensure no users are currently using the system
- All active sessions should be closed

---

## 🔄 Migration Steps

### Step 1: Prepare Data (BEFORE migration)

Run the data preparation script to assign all existing data to a default company:

```bash
# This script creates "Legacy Company" and assigns all existing records to it
npx ts-node scripts/migrate-to-multitenant.ts
```

**What it does:**
- Creates a default company: "Legacy Company" 
- Updates ALL existing records to reference this company
- Prepares database for the schema migration

**Expected Output:**
```
🚀 Starting multi-tenant data migration...

📦 Step 1: Creating default company...
✅ Default company created: Legacy Company (default-company-001)

📊 Step 2: Counting existing records...
Records to migrate:
  - customers: 4
  - products: 7
  - employees: 3
  - payrolls: 27
  - ... etc

🔄 Step 3: Assigning companyId to existing records...
✅ Updated 4 customers
✅ Updated 7 products
✅ Updated 3 employees
... etc

✅ Data migration completed successfully!
```

---

### Step 2: Apply Schema Migration

Once data is prepared, apply the Prisma migration:

```bash
# Apply the migration to add companyId columns and constraints
npx prisma migrate deploy
```

**What it does:**
- Adds `companyId` column to 38 tables
- Creates 38 foreign key constraints to Company table
- Adds 38 indexes on companyId for performance
- Updates 13 unique constraints to include companyId
- Sets up CASCADE delete for data integrity

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

1 migration found in prisma/migrations

Applying migration `20251125032813_add_company_id_multi_tenant`

The following migration(s) have been applied:

migrations/
  └─ 20251125032813_add_company_id_multi_tenant/
    └─ migration.sql

All migrations have been successfully applied.
```

---

### Step 3: Verify Migration

After migration, verify everything is working:

```bash
# Generate Prisma Client with new schema
npx prisma generate

# Check database state
npx prisma studio
```

**Manual Verification:**
1. Open Prisma Studio
2. Check `Company` table - should have 1 record ("Legacy Company")
3. Check any business table (customers, products, etc.)
4. Verify `companyId` column exists and is populated
5. Verify all records have `companyId = "default-company-001"`

---

### Step 4: Restart Application

```bash
# Restart your development server
npm run dev
```

The application should now run with multi-tenant schema, but all data still belongs to the default company.

---

## 🧪 Testing Migration Success

### 1. Database Structure Test
```sql
-- Check companyId column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' AND column_name = 'companyId';

-- Should return: companyId | text

-- Verify foreign key exists
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
  AND table_name = 'customers';

-- Should include: customers_companyId_fkey
```

### 2. Data Integrity Test
```sql
-- All customers should have a companyId
SELECT COUNT(*) FROM customers WHERE "companyId" IS NULL;
-- Should return: 0

-- All customers should reference the default company
SELECT COUNT(*) FROM customers WHERE "companyId" = 'default-company-001';
-- Should return: [your customer count]

-- Verify cascade delete is working (DON'T RUN IN PRODUCTION!)
-- This test should be done in a test environment only
BEGIN;
  DELETE FROM companies WHERE id = 'test-company-id';
  -- Should cascade delete all related records
ROLLBACK;
```

### 3. Application Test
1. Start the application
2. Log in as admin user
3. Navigate to customers page - should show all existing customers
4. Create a new customer - should automatically assign to default company
5. Check database - new customer should have `companyId = "default-company-001"`

---

## 🔮 Post-Migration: Creating Additional Companies

### Option 1: Via Seed Script (Development)

Update `prisma/seed.ts`:

```typescript
// Create additional test companies
const company2 = await prisma.company.create({
  data: {
    name: 'Acme Corp',
    legalName: 'Acme Corporation LLC',
    taxId: '12-3456789',
    industry: 'Technology',
    country: 'US',
    state: 'FL',
    city: 'Miami',
    isActive: true,
    subscription: 'PRO',
  },
})

// Create customers for this company
await prisma.customer.create({
  data: {
    companyId: company2.id,
    name: 'John Doe',
    email: 'john@acme.com',
    // ... other fields
  },
})
```

Run seed:
```bash
npx ts-node prisma/seed.ts
```

### Option 2: Via API (Production)

Once Phase 2 is complete, you'll have endpoints:

```typescript
// POST /api/companies
const response = await fetch('/api/companies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'New Client Company',
    legalName: 'New Client LLC',
    taxId: '98-7654321',
    industry: 'Retail',
    // ... other fields
  }),
})

const newCompany = await response.json()
```

### Option 3: Via Prisma Studio (Manual)

1. Open Prisma Studio: `npx prisma studio`
2. Navigate to `Company` model
3. Click "Add record"
4. Fill in company details
5. Save

---

## 🛡️ Rollback Strategy

If migration fails, you can rollback:

### Full Rollback (Restore Backup)
```bash
# Stop application
npm run stop

# Drop current database
dropdb -h localhost -U postgres quickbooks_db

# Create fresh database
createdb -h localhost -U postgres quickbooks_db

# Restore from backup
psql -h localhost -U postgres -d quickbooks_db < backup_before_multitenant.sql

# Reset Prisma migrations
rm -rf prisma/migrations/20251125032813_add_company_id_multi_tenant

# Generate Prisma client
npx prisma generate

# Restart application
npm run dev
```

### Partial Rollback (Undo Migration Only)
```bash
# This removes the migration but keeps the Company table
npx prisma migrate resolve --rolled-back 20251125032813_add_company_id_multi_tenant
```

---

## 📊 Migration Impact

### Database Changes
- **Tables Modified**: 38 core business tables
- **Columns Added**: 38 `companyId` columns
- **Foreign Keys Added**: 38 to Company table
- **Indexes Added**: 38 on companyId
- **Unique Constraints Modified**: 13 to include companyId
- **Cascade Deletes**: 38 (deleting company deletes all its data)

### Performance Impact
- **Query Speed**: Minimal impact (indexes on companyId)
- **Storage**: +24 bytes per record (cuid length)
- **Migration Time**: ~30 seconds for 1000 records
- **Downtime**: 1-2 minutes (during migration)

### Application Changes Required (Phase 2-4)
- **API Endpoints**: ~50 need companyId filtering
- **Frontend Pages**: ~30 need company context
- **New Features**: Company selector, accountant dashboard
- **Testing**: Full regression testing required

---

## ❓ Troubleshooting

### Error: "relation already exists"
**Solution**: Migration was partially applied. Rollback and reapply:
```bash
npx prisma migrate resolve --rolled-back 20251125032813_add_company_id_multi_tenant
npx prisma migrate deploy
```

### Error: "column companyId does not exist"
**Solution**: Migration wasn't applied. Run:
```bash
npx prisma migrate deploy
npx prisma generate
```

### Error: "duplicate key value violates unique constraint"
**Solution**: Existing data has duplicates. Find and fix:
```sql
-- Find duplicate SKUs (example)
SELECT sku, COUNT(*) 
FROM products 
GROUP BY sku 
HAVING COUNT(*) > 1;
```

### Error: "null value in column companyId"
**Solution**: Data wasn't migrated first. Run:
```bash
npx ts-node scripts/migrate-to-multitenant.ts
```

---

## 📝 Migration Checklist

Use this to track your progress:

- [ ] Database backup completed
- [ ] Current data counts documented
- [ ] Application in maintenance mode
- [ ] Data migration script executed successfully
- [ ] `npx prisma migrate deploy` completed
- [ ] `npx prisma generate` executed
- [ ] Database verification passed (Prisma Studio check)
- [ ] SQL integrity tests passed
- [ ] Application restarted successfully
- [ ] Can view existing data in application
- [ ] Can create new records with companyId
- [ ] Default company visible in database
- [ ] Backup can be restored (test in dev)

---

## 🎯 Next Steps After Migration

1. **Phase 2**: Update API endpoints to filter by companyId
2. **Phase 3**: Add company selector to UI
3. **Phase 4**: Implement permissions and access control
4. **Testing**: Full regression testing of all features
5. **Deployment**: Deploy to production with zero-downtime strategy

---

## 📞 Support

If you encounter issues during migration:

1. Check troubleshooting section above
2. Review Prisma migration logs
3. Verify database state with SQL queries
4. Restore from backup if needed
5. Reach out to development team

---

## ⚠️ Important Notes

- **NEVER** run this migration in production without testing in development first
- **ALWAYS** backup before migration
- **VERIFY** data migration script completed successfully before applying schema changes
- **TEST** rollback procedure in development environment
- **DOCUMENT** any custom changes made during migration
- **PLAN** for application downtime (1-2 minutes minimum)

---

**Migration Created**: November 25, 2024
**Schema Version**: add_company_id_multi_tenant
**Migration ID**: 20251125032813
