-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "debtPaymentId" UUID;

-- CreateIndex
CREATE INDEX "expenses_debtPaymentId_idx" ON "expenses"("debtPaymentId");
