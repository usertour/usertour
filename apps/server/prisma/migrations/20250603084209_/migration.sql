/*
  Warnings:

  - A unique constraint covering the columns `[accessToken]` on the table `Integration` will be added. If there are existing duplicate values, this will fail.
  - The required column `accessToken` was added to the `Integration` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Integration" ADD COLUMN     "accessToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Integration_accessToken_key" ON "Integration"("accessToken");
