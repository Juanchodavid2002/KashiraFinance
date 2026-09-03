/*
  Warnings:

  - Added the required column `kind` to the `debts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DebtKind" AS ENUM ('ENTITY', 'PERSONAL');

-- AlterTable
ALTER TABLE "debts" ADD COLUMN     "kind" "DebtKind" NOT NULL;
