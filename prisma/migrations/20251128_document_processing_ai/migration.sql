-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'ANALYZED', 'APPROVED', 'REJECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'RECEIPT', 'BANK_STATEMENT', 'TAX_DOCUMENT', 'CONTRACT', 'EXPENSE_REPORT', 'PAYROLL', 'OTHER');

-- CreateTable
CREATE TABLE "uploaded_documents" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT,
    "fileUrl" TEXT,
    "documentType" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedById" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ocrText" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "aiAnalysis" JSONB,
    "extractedData" JSONB,
    "suggestedAccountId" TEXT,
    "suggestedCategory" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "processingTime" INTEGER,
    "journalEntryId" TEXT,
    "transactionId" TEXT,
    "expenseId" TEXT,
    "vendorId" TEXT,
    "customerId" TEXT,
    "amount" DOUBLE PRECISION,
    "documentDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uploaded_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_processing_logs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "details" JSONB,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable  
CREATE TABLE "ai_categorization_rules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorPattern" TEXT,
    "descriptionPattern" TEXT,
    "amountMin" DOUBLE PRECISION,
    "amountMax" DOUBLE PRECISION,
    "accountId" TEXT NOT NULL,
    "category" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_categorization_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "uploaded_documents_companyId_idx" ON "uploaded_documents"("companyId");
CREATE INDEX "uploaded_documents_status_idx" ON "uploaded_documents"("status");
CREATE INDEX "uploaded_documents_documentType_idx" ON "uploaded_documents"("documentType");
CREATE INDEX "uploaded_documents_uploadedById_idx" ON "uploaded_documents"("uploadedById");
CREATE INDEX "uploaded_documents_createdAt_idx" ON "uploaded_documents"("createdAt");

-- CreateIndex
CREATE INDEX "document_processing_logs_documentId_idx" ON "document_processing_logs"("documentId");

-- CreateIndex
CREATE INDEX "ai_categorization_rules_companyId_idx" ON "ai_categorization_rules"("companyId");

-- AddForeignKey
ALTER TABLE "uploaded_documents" ADD CONSTRAINT "uploaded_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_documents" ADD CONSTRAINT "uploaded_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_documents" ADD CONSTRAINT "uploaded_documents_suggestedAccountId_fkey" FOREIGN KEY ("suggestedAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_documents" ADD CONSTRAINT "uploaded_documents_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_documents" ADD CONSTRAINT "uploaded_documents_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_processing_logs" ADD CONSTRAINT "document_processing_logs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "uploaded_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_categorization_rules" ADD CONSTRAINT "ai_categorization_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_categorization_rules" ADD CONSTRAINT "ai_categorization_rules_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
