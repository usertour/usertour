-- AlterTable
ALTER TABLE "BizEvent" ADD COLUMN     "contentId" TEXT,
ADD COLUMN     "versionId" TEXT;

-- CreateIndex
CREATE INDEX "BizEvent_contentId_idx" ON "BizEvent"("contentId");
