-- AlterTable
ALTER TABLE "debts" ADD COLUMN     "installmentAmount" DECIMAL(14,2),
ADD COLUMN     "paidInstallments" INTEGER,
ADD COLUMN     "totalInstallments" INTEGER;
