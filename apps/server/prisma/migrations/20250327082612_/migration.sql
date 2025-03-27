/*
  Warnings:

  - A unique constraint covering the columns `[bizSessionId,cvid]` on the table `BizAnswer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bizSessionId` to the `BizAnswer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BizAnswer" ADD COLUMN     "bizSessionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BizAnswer_bizSessionId_cvid_key" ON "BizAnswer"("bizSessionId", "cvid");
