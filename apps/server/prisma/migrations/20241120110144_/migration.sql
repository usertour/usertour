/*
  Warnings:

  - You are about to drop the column `predefined` on the `Localization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Localization" DROP COLUMN "predefined",
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;
