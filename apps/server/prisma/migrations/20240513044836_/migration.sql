/*
  Warnings:

  - You are about to drop the `ExternalBizData` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ExternalBizData" DROP CONSTRAINT "ExternalBizData_environmentId_fkey";

-- DropTable
DROP TABLE "ExternalBizData";

-- CreateTable
CREATE TABLE "BizUser" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "environmentId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BizUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizUserOnCompany" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bizCompanyId" TEXT NOT NULL,
    "bizUserId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "BizUserOnCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizCompany" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "environmentId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BizCompany_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BizUser_externalId_idx" ON "BizUser"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "BizUser_environmentId_externalId_key" ON "BizUser"("environmentId", "externalId");

-- CreateIndex
CREATE INDEX "BizUserOnCompany_bizUserId_idx" ON "BizUserOnCompany"("bizUserId");

-- CreateIndex
CREATE UNIQUE INDEX "BizUserOnCompany_bizCompanyId_bizUserId_key" ON "BizUserOnCompany"("bizCompanyId", "bizUserId");

-- CreateIndex
CREATE INDEX "BizCompany_externalId_idx" ON "BizCompany"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "BizCompany_environmentId_externalId_key" ON "BizCompany"("environmentId", "externalId");

-- AddForeignKey
ALTER TABLE "BizUser" ADD CONSTRAINT "BizUser_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizUserOnCompany" ADD CONSTRAINT "BizUserOnCompany_bizCompanyId_fkey" FOREIGN KEY ("bizCompanyId") REFERENCES "BizCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizUserOnCompany" ADD CONSTRAINT "BizUserOnCompany_bizUserId_fkey" FOREIGN KEY ("bizUserId") REFERENCES "BizUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizCompany" ADD CONSTRAINT "BizCompany_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
