/*
  Warnings:

  - The `data` column on the `Version` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Version" ADD COLUMN     "config" JSONB,
DROP COLUMN "data",
ADD COLUMN     "data" JSONB;
