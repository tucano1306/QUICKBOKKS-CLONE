/*
  Warnings:

  - The `category` column on the `bank_transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[plaidAccountId]` on the table `bank_accounts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[plaidTransactionId]` on the table `bank_transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amount` to the `bank_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `bank_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `reconciliation_matches` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BankAccountStatus" ADD VALUE 'PENDING';
ALTER TYPE "BankAccountStatus" ADD VALUE 'REQUIRES_UPDATE';
ALTER TYPE "BankAccountStatus" ADD VALUE 'ERROR';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BankAccountType" ADD VALUE 'CREDIT_CARD';
ALTER TYPE "BankAccountType" ADD VALUE 'MONEY_MARKET';
ALTER TYPE "BankAccountType" ADD VALUE 'LOAN';
ALTER TYPE "BankAccountType" ADD VALUE 'OTHER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MatchType" ADD VALUE 'EXACT';
ALTER TYPE "MatchType" ADD VALUE 'FUZZY';
ALTER TYPE "MatchType" ADD VALUE 'RULE_BASED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReconciliationStatus" ADD VALUE 'LOCKED';
ALTER TYPE "ReconciliationStatus" ADD VALUE 'REOPENED';

-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN     "accountSubtype" TEXT,
ADD COLUMN     "autoSync" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availableBalance" DOUBLE PRECISION,
ADD COLUMN     "institutionId" TEXT,
ADD COLUMN     "institutionName" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "mask" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "plaidAccessToken" TEXT,
ADD COLUMN     "plaidAccountId" TEXT,
ADD COLUMN     "plaidItemId" TEXT,
ADD COLUMN     "syncFrequency" INTEGER NOT NULL DEFAULT 24,
ALTER COLUMN "accountNumber" DROP NOT NULL,
ALTER COLUMN "bankName" DROP NOT NULL,
ALTER COLUMN "currency" SET DEFAULT 'USD';

-- AlterTable
ALTER TABLE "bank_transactions" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "authorizedDate" TIMESTAMP(3),
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "isoCurrencyCode" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "location" JSONB,
ADD COLUMN     "matchedExpenseId" TEXT,
ADD COLUMN     "matchedInvoiceId" TEXT,
ADD COLUMN     "matchedPaymentId" TEXT,
ADD COLUMN     "merchantName" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "paymentChannel" TEXT,
ADD COLUMN     "paymentMeta" JSONB,
ADD COLUMN     "pending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plaidTransactionId" TEXT,
ADD COLUMN     "reconciledAt" TIMESTAMP(3),
ADD COLUMN     "reconciledBy" TEXT,
ADD COLUMN     "transactionCode" TEXT,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "balance" SET DEFAULT 0,
DROP COLUMN "category",
ADD COLUMN     "category" TEXT[];

-- AlterTable
ALTER TABLE "reconciliation_matches" ADD COLUMN     "amountDifference" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedBy" TEXT,
ADD COLUMN     "dateDifference" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "reconciliation_rules" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB NOT NULL,
    "categoryId" TEXT,
    "accountId" TEXT,
    "autoMatch" BOOLEAN NOT NULL DEFAULT false,
    "addTags" TEXT[],
    "timesApplied" INTEGER NOT NULL DEFAULT 0,
    "lastAppliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reconciliation_rules_userId_idx" ON "reconciliation_rules"("userId");

-- CreateIndex
CREATE INDEX "reconciliation_rules_bankAccountId_idx" ON "reconciliation_rules"("bankAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_plaidAccountId_key" ON "bank_accounts"("plaidAccountId");

-- CreateIndex
CREATE INDEX "bank_accounts_userId_idx" ON "bank_accounts"("userId");

-- CreateIndex
CREATE INDEX "bank_accounts_plaidItemId_idx" ON "bank_accounts"("plaidItemId");

-- CreateIndex
CREATE INDEX "bank_reconciliations_bankAccountId_idx" ON "bank_reconciliations"("bankAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_plaidTransactionId_key" ON "bank_transactions"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "bank_transactions_bankAccountId_idx" ON "bank_transactions"("bankAccountId");

-- CreateIndex
CREATE INDEX "bank_transactions_date_idx" ON "bank_transactions"("date");

-- CreateIndex
CREATE INDEX "bank_transactions_reconciled_idx" ON "bank_transactions"("reconciled");

-- CreateIndex
CREATE INDEX "reconciliation_matches_reconciliationId_idx" ON "reconciliation_matches"("reconciliationId");

-- CreateIndex
CREATE INDEX "reconciliation_matches_bankTransactionId_idx" ON "reconciliation_matches"("bankTransactionId");

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_matchedInvoiceId_fkey" FOREIGN KEY ("matchedInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_matchedExpenseId_fkey" FOREIGN KEY ("matchedExpenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_matchedPaymentId_fkey" FOREIGN KEY ("matchedPaymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_rules" ADD CONSTRAINT "reconciliation_rules_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_rules" ADD CONSTRAINT "reconciliation_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
