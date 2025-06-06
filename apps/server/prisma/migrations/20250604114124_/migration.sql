-- AlterTable
ALTER TABLE "BizAnswer" ADD COLUMN     "environmentId" TEXT;

-- CreateIndex
CREATE INDEX "BizAnswer_environmentId_contentId_cvid_bizUserId_idx" ON "BizAnswer"("environmentId", "contentId", "cvid", "bizUserId");
