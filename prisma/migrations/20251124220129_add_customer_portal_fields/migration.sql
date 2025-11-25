-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "portalActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "portalLastLogin" TIMESTAMP(3),
ADD COLUMN     "portalPassword" TEXT;
