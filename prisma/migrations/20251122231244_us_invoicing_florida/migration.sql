-- CreateEnum
CREATE TYPE "EInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID', 'CANCELLED');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "billToAddress" TEXT,
ADD COLUMN     "poNumber" TEXT,
ADD COLUMN     "salesTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "shipToAddress" TEXT,
ADD COLUMN     "taxExempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxExemptReason" TEXT;

-- CreateTable
CREATE TABLE "e_invoices" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyEIN" TEXT NOT NULL,
    "companyAddress" TEXT NOT NULL,
    "companyCity" TEXT NOT NULL,
    "companyState" TEXT NOT NULL DEFAULT 'FL',
    "companyZip" TEXT NOT NULL,
    "companyPhone" TEXT,
    "companyEmail" TEXT,
    "customerName" TEXT NOT NULL,
    "customerTaxId" TEXT,
    "customerAddress" TEXT NOT NULL,
    "customerCity" TEXT NOT NULL,
    "customerState" TEXT NOT NULL,
    "customerZip" TEXT NOT NULL,
    "customerEmail" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "poNumber" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxableAmount" DOUBLE PRECISION NOT NULL,
    "salesTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salesTaxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "floridaSalesTax" BOOLEAN NOT NULL DEFAULT true,
    "countyTax" DOUBLE PRECISION,
    "discretionaryTax" DOUBLE PRECISION,
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "exemptionCertificate" TEXT,
    "paymentTerms" TEXT,
    "paymentMethod" TEXT,
    "status" "EInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "sentDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "voidDate" TIMESTAMP(3),
    "voidReason" TEXT,
    "pdfPath" TEXT,
    "pdfContent" TEXT,
    "irsSent" BOOLEAN NOT NULL DEFAULT false,
    "form1099Required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_tax_rates" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "county" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "stateTaxRate" DOUBLE PRECISION NOT NULL,
    "countyTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cityTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTaxRate" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_exemptions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "certificateType" TEXT NOT NULL,
    "issuingState" TEXT NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "certificatePath" TEXT,
    "certificateFile" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_exemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_1099" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "vendorTaxId" TEXT NOT NULL,
    "vendorAddress" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "box1Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box2Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box3Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box4Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "box7Amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "filed" BOOLEAN NOT NULL DEFAULT false,
    "filedDate" TIMESTAMP(3),
    "eFileStatus" TEXT,
    "pdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_1099_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "w9_forms" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "businessName" TEXT,
    "taxClassification" TEXT NOT NULL,
    "ein" TEXT,
    "ssn" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "exemptPayeeCode" TEXT,
    "exemptFATCA" BOOLEAN NOT NULL DEFAULT false,
    "signedDate" TIMESTAMP(3),
    "signaturePath" TEXT,
    "w9FilePath" TEXT,
    "w9FileContent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "w9_forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "e_invoices_invoiceId_key" ON "e_invoices"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "e_invoices_invoiceNumber_key" ON "e_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "e_invoices_invoiceNumber_idx" ON "e_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "e_invoices_companyEIN_idx" ON "e_invoices"("companyEIN");

-- CreateIndex
CREATE INDEX "e_invoices_customerTaxId_idx" ON "e_invoices"("customerTaxId");

-- CreateIndex
CREATE INDEX "e_invoices_issueDate_idx" ON "e_invoices"("issueDate");

-- CreateIndex
CREATE INDEX "sales_tax_rates_zipCode_idx" ON "sales_tax_rates"("zipCode");

-- CreateIndex
CREATE UNIQUE INDEX "sales_tax_rates_state_county_city_zipCode_effectiveDate_key" ON "sales_tax_rates"("state", "county", "city", "zipCode", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "tax_exemptions_certificateNumber_key" ON "tax_exemptions"("certificateNumber");

-- CreateIndex
CREATE INDEX "tax_exemptions_customerId_idx" ON "tax_exemptions"("customerId");

-- CreateIndex
CREATE INDEX "form_1099_year_idx" ON "form_1099"("year");

-- CreateIndex
CREATE INDEX "form_1099_vendorTaxId_idx" ON "form_1099"("vendorTaxId");

-- CreateIndex
CREATE UNIQUE INDEX "form_1099_year_vendorId_formType_key" ON "form_1099"("year", "vendorId", "formType");

-- CreateIndex
CREATE UNIQUE INDEX "w9_forms_vendorId_key" ON "w9_forms"("vendorId");

-- AddForeignKey
ALTER TABLE "e_invoices" ADD CONSTRAINT "e_invoices_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
