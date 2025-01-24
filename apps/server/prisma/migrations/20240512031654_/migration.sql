/*
  Warnings:

  - You are about to drop the `AttributeValue` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AttributeValue" DROP CONSTRAINT "AttributeValue_environmentId_fkey";

-- AlterTable
ALTER TABLE "Attribute" ADD COLUMN     "predefined" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "randomMax" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "AttributeValue";

-- CreateTable
CREATE TABLE "ExternalBizData" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "environmentId" TEXT NOT NULL,
    "bizId" TEXT NOT NULL DEFAULT '',
    "bizType" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExternalBizData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalBizData_bizId_bizType_idx" ON "ExternalBizData"("bizId", "bizType");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalBizData_environmentId_bizId_bizType_key" ON "ExternalBizData"("environmentId", "bizId", "bizType");

-- AddForeignKey
ALTER TABLE "ExternalBizData" ADD CONSTRAINT "ExternalBizData_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
