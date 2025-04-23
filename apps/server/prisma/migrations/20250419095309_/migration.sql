/*
  Warnings:

  - A unique constraint covering the columns `[projectId,displayName]` on the table `Integration` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[projectId,codeName]` on the table `Integration` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Integration_codeName_key";

-- DropIndex
DROP INDEX "Integration_displayName_key";

-- CreateIndex
CREATE UNIQUE INDEX "Integration_projectId_displayName_key" ON "Integration"("projectId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_projectId_codeName_key" ON "Integration"("projectId", "codeName");
