-- AlterTable
ALTER TABLE "payrolls" ADD COLUMN "checkNumber" TEXT;
ALTER TABLE "payrolls" ADD COLUMN "checkDate" TIMESTAMP(3);
ALTER TABLE "payrolls" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'Check';
