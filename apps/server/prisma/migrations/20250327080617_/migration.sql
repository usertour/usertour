/*
  Warnings:

  - Added the required column `bizUserId` to the `BizAnswer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BizAnswer" ADD COLUMN     "bizUserId" TEXT NOT NULL;
