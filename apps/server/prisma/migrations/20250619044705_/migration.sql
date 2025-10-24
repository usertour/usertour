/*
  Warnings:

  - You are about to drop the column `settings` on the `IntegrationObjectMapping` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "IntegrationObjectMapping" DROP COLUMN "settings",
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT false;
