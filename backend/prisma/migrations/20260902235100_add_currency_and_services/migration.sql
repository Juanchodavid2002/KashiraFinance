-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('COP', 'USD', 'MXN', 'EUR', 'ARS', 'CLP');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'COP';

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_payments" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_payments_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "servicePaymentId" UUID;

-- CreateIndex
CREATE INDEX "services_userId_createdAt_idx" ON "services"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "service_payments_serviceId_paidDate_idx" ON "service_payments"("serviceId", "paidDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "expenses_servicePaymentId_key" ON "expenses"("servicePaymentId");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_payments" ADD CONSTRAINT "service_payments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;