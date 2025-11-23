-- CreateEnum
CREATE TYPE "Form1099Type" AS ENUM ('NEC', 'MISC', 'INT', 'DIV', 'B', 'K');

-- CreateEnum
CREATE TYPE "Tax1099Status" AS ENUM ('DRAFT', 'READY', 'SENT', 'FILED', 'CORRECTED', 'VOID');

-- CreateEnum
CREATE TYPE "TaxClassification" AS ENUM ('INDIVIDUAL', 'C_CORPORATION', 'S_CORPORATION', 'PARTNERSHIP', 'TRUST_ESTATE', 'LLC_C', 'LLC_S', 'LLC_PARTNERSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "TINType" AS ENUM ('SSN', 'EIN');

-- CreateEnum
CREATE TYPE "W9Status" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FilingPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY', 'SEMI_ANNUALLY');

-- CreateEnum
CREATE TYPE "TaxFilingStatus" AS ENUM ('DRAFT', 'READY', 'FILED', 'PAID', 'LATE', 'AMENDED');

-- CreateEnum
CREATE TYPE "NexusType" AS ENUM ('PHYSICAL', 'ECONOMIC', 'CLICK_THROUGH', 'MARKETPLACE');

-- CreateEnum
CREATE TYPE "TaxDeadlineType" AS ENUM ('FEDERAL_INCOME_TAX', 'STATE_INCOME_TAX', 'SALES_TAX', 'PAYROLL_TAX', 'FORM_1099', 'FORM_W2', 'FORM_941', 'FORM_940', 'FORM_1096', 'ANNUAL_REPORT', 'FRANCHISE_TAX', 'ESTIMATED_TAX');

-- CreateEnum
CREATE TYPE "DeadlineFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "DeadlineStatus" AS ENUM ('UPCOMING', 'DUE_SOON', 'OVERDUE', 'COMPLETED', 'EXTENDED', 'WAIVED');

-- CreateTable
CREATE TABLE "tax_form_1099" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payerName" TEXT NOT NULL,
    "payerEIN" TEXT NOT NULL,
    "payerAddress" TEXT NOT NULL,
    "payerCity" TEXT NOT NULL,
    "payerState" TEXT NOT NULL,
    "payerZip" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientTIN" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "recipientCity" TEXT NOT NULL,
    "recipientState" TEXT NOT NULL,
    "recipientZip" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "formType" "Form1099Type" NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "box1Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box2Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box3Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box4Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box5Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box6Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box7Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box8Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box10Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "Tax1099Status" NOT NULL DEFAULT 'DRAFT',
    "filingRequired" BOOLEAN NOT NULL DEFAULT true,
    "filedDate" TIMESTAMP(3),
    "correctionOf" TEXT,
    "isCorrection" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentToRecipient" BOOLEAN NOT NULL DEFAULT false,
    "sentDate" TIMESTAMP(3),
    "filedWithIRS" BOOLEAN NOT NULL DEFAULT false,
    "irsFiledDate" TIMESTAMP(3),
    "expenseIds" TEXT[],
    "invoiceIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_form_1099_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "w9_information" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "individualName" TEXT,
    "taxClassification" "TaxClassification" NOT NULL,
    "otherClassification" TEXT,
    "exemptPayeeCode" TEXT,
    "fatcaExemptCode" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "tinType" "TINType" NOT NULL,
    "tin" TEXT NOT NULL,
    "certifiedDate" TIMESTAMP(3),
    "signature" TEXT,
    "isCertified" BOOLEAN NOT NULL DEFAULT false,
    "requestedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedDate" TIMESTAMP(3),
    "status" "W9Status" NOT NULL DEFAULT 'PENDING',
    "vendorId" TEXT,
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "w9_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_form_1096" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "formType" TEXT NOT NULL,
    "totalForms" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "payerName" TEXT NOT NULL,
    "payerEIN" TEXT NOT NULL,
    "payerAddress" TEXT NOT NULL,
    "payerCity" TEXT NOT NULL,
    "payerState" TEXT NOT NULL,
    "payerZip" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "filedDate" TIMESTAMP(3),
    "filedWithIRS" BOOLEAN NOT NULL DEFAULT false,
    "confirmationNumber" TEXT,
    "form1099Ids" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_form_1096_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_tax_filing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "county" TEXT,
    "city" TEXT,
    "jurisdiction" TEXT NOT NULL,
    "filingPeriod" "FilingPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "grossSales" DOUBLE PRECISION NOT NULL,
    "taxableSales" DOUBLE PRECISION NOT NULL,
    "exemptSales" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "taxCollected" DOUBLE PRECISION NOT NULL,
    "taxDue" DOUBLE PRECISION NOT NULL,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "penalties" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netTaxDue" DOUBLE PRECISION NOT NULL,
    "status" "TaxFilingStatus" NOT NULL DEFAULT 'DRAFT',
    "filedDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "confirmationNumber" TEXT,
    "returnFileUrl" TEXT,
    "paymentProof" TEXT,
    "hasNexus" BOOLEAN NOT NULL DEFAULT true,
    "nexusType" "NexusType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_tax_filing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_deadlines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taxType" "TaxDeadlineType" NOT NULL,
    "formName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "isMultiState" BOOLEAN NOT NULL DEFAULT false,
    "states" TEXT[],
    "dueDate" TIMESTAMP(3) NOT NULL,
    "extensionDate" TIMESTAMP(3),
    "filingPeriod" TEXT NOT NULL,
    "frequency" "DeadlineFrequency" NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "status" "DeadlineStatus" NOT NULL DEFAULT 'UPCOMING',
    "completedDate" TIMESTAMP(3),
    "penaltyAmount" DOUBLE PRECISION,
    "penaltyRate" DOUBLE PRECISION,
    "interestRate" DOUBLE PRECISION,
    "reminderDays" INTEGER[],
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "lastNotification" TIMESTAMP(3),
    "relatedFilingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_tax_nexus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "economicThreshold" DOUBLE PRECISION NOT NULL,
    "transactionThreshold" INTEGER,
    "currentYearSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentYearTransactions" INTEGER NOT NULL DEFAULT 0,
    "lastYearSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastYearTransactions" INTEGER NOT NULL DEFAULT 0,
    "hasNexus" BOOLEAN NOT NULL DEFAULT false,
    "nexusType" "NexusType",
    "nexusDate" TIMESTAMP(3),
    "isRegistered" BOOLEAN NOT NULL DEFAULT false,
    "registrationDate" TIMESTAMP(3),
    "taxId" TEXT,
    "certificateUrl" TEXT,
    "filingFrequency" "FilingPeriod",
    "nextFilingDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_tax_nexus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_form_1099_userId_idx" ON "tax_form_1099"("userId");

-- CreateIndex
CREATE INDEX "tax_form_1099_recipientTIN_idx" ON "tax_form_1099"("recipientTIN");

-- CreateIndex
CREATE INDEX "tax_form_1099_taxYear_idx" ON "tax_form_1099"("taxYear");

-- CreateIndex
CREATE INDEX "tax_form_1099_status_idx" ON "tax_form_1099"("status");

-- CreateIndex
CREATE INDEX "w9_information_userId_idx" ON "w9_information"("userId");

-- CreateIndex
CREATE INDEX "w9_information_vendorId_idx" ON "w9_information"("vendorId");

-- CreateIndex
CREATE INDEX "w9_information_status_idx" ON "w9_information"("status");

-- CreateIndex
CREATE INDEX "tax_form_1096_userId_idx" ON "tax_form_1096"("userId");

-- CreateIndex
CREATE INDEX "tax_form_1096_taxYear_idx" ON "tax_form_1096"("taxYear");

-- CreateIndex
CREATE INDEX "sales_tax_filing_userId_idx" ON "sales_tax_filing"("userId");

-- CreateIndex
CREATE INDEX "sales_tax_filing_state_idx" ON "sales_tax_filing"("state");

-- CreateIndex
CREATE INDEX "sales_tax_filing_periodStart_idx" ON "sales_tax_filing"("periodStart");

-- CreateIndex
CREATE INDEX "sales_tax_filing_dueDate_idx" ON "sales_tax_filing"("dueDate");

-- CreateIndex
CREATE INDEX "sales_tax_filing_status_idx" ON "sales_tax_filing"("status");

-- CreateIndex
CREATE INDEX "tax_deadlines_userId_idx" ON "tax_deadlines"("userId");

-- CreateIndex
CREATE INDEX "tax_deadlines_dueDate_idx" ON "tax_deadlines"("dueDate");

-- CreateIndex
CREATE INDEX "tax_deadlines_status_idx" ON "tax_deadlines"("status");

-- CreateIndex
CREATE INDEX "tax_deadlines_taxType_idx" ON "tax_deadlines"("taxType");

-- CreateIndex
CREATE INDEX "sales_tax_nexus_userId_idx" ON "sales_tax_nexus"("userId");

-- CreateIndex
CREATE INDEX "sales_tax_nexus_hasNexus_idx" ON "sales_tax_nexus"("hasNexus");

-- CreateIndex
CREATE UNIQUE INDEX "sales_tax_nexus_userId_state_key" ON "sales_tax_nexus"("userId", "state");
