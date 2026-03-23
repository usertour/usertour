-- AlterTable
ALTER TABLE "BizEvent" ADD COLUMN     "bizCompanyId" TEXT;

-- CreateIndex
CREATE INDEX "BizEvent_bizCompanyId_idx" ON "BizEvent"("bizCompanyId");

-- AddForeignKey
ALTER TABLE "BizEvent" ADD CONSTRAINT "BizEvent_bizCompanyId_fkey" FOREIGN KEY ("bizCompanyId") REFERENCES "BizCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
