/*
  Warnings:

  - You are about to drop the column `code` on the `Integration` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[environmentId,provider]` on the table `Integration` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `provider` to the `Integration` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Integration_environmentId_code_key";

-- AlterTable
ALTER TABLE "Integration" DROP COLUMN "code",
ADD COLUMN     "provider" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Integration_environmentId_provider_key" ON "Integration"("environmentId", "provider");
