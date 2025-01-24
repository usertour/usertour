-- AlterTable
ALTER TABLE "BizCompany" ALTER COLUMN "data" DROP NOT NULL;

-- AlterTable
ALTER TABLE "BizUser" ADD COLUMN     "bizCompanyId" TEXT;

-- AddForeignKey
ALTER TABLE "BizUser" ADD CONSTRAINT "BizUser_bizCompanyId_fkey" FOREIGN KEY ("bizCompanyId") REFERENCES "BizCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
