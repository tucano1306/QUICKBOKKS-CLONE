-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "employeeType" TEXT NOT NULL DEFAULT 'EMPLOYEE';

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "employeeId" TEXT;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
