/*
  Warnings:

  - The required column `cvid` was added to the `Step` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Step" ADD COLUMN     "cvid" TEXT NOT NULL;
