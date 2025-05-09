-- AlterTable
ALTER TABLE "BizSession" ADD COLUMN     "bizCompanyId" TEXT;

-- AddForeignKey
ALTER TABLE "BizSession" ADD CONSTRAINT "BizSession_bizCompanyId_fkey" FOREIGN KEY ("bizCompanyId") REFERENCES "BizCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
