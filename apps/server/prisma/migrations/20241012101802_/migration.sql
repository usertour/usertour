/*
  Warnings:

  - A unique constraint covering the columns `[versionId,cvid]` on the table `Step` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Step_versionId_cvid_key" ON "Step"("versionId", "cvid");
