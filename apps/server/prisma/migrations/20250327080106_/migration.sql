/*
  Warnings:

  - Added the required column `versionId` to the `BizAnswer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BizAnswer" ADD COLUMN     "versionId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "BizAnswer_versionId_cvid_idx" ON "BizAnswer"("versionId", "cvid");
