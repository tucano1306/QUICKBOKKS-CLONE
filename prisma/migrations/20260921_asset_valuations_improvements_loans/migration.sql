-- CreateTable
CREATE TABLE "asset_valuations" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "mileage" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT,

    CONSTRAINT "asset_valuations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_improvements" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "addsLifetimeMiles" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT,

    CONSTRAINT "asset_improvements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_loans" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "lender" TEXT,
    "amountFinanced" DOUBLE PRECISION NOT NULL,
    "downPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "apr" DOUBLE PRECISION NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "firstPaymentDate" TIMESTAMP(3),
    "maturityDate" TIMESTAMP(3),
    "currentBalance" DOUBLE PRECISION,
    "paymentsRemaining" INTEGER,
    "interestPaidLast12" DOUBLE PRECISION,
    "statementDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "asset_loans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_valuations_assetId_date_idx" ON "asset_valuations"("assetId", "date");

-- CreateIndex
CREATE INDEX "asset_improvements_assetId_date_idx" ON "asset_improvements"("assetId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "asset_loans_assetId_key" ON "asset_loans"("assetId");

-- AddForeignKey
ALTER TABLE "asset_valuations" ADD CONSTRAINT "asset_valuations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_improvements" ADD CONSTRAINT "asset_improvements_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_loans" ADD CONSTRAINT "asset_loans_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

