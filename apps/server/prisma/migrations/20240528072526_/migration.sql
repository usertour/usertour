/*
  Warnings:

  - You are about to drop the column `displayAttrs` on the `Segment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Segment" DROP COLUMN "displayAttrs",
ADD COLUMN     "columns" JSONB;
