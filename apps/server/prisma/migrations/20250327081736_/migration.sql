-- DropIndex
DROP INDEX "BizAnswer_contentId_cvid_idx";

-- DropIndex
DROP INDEX "BizAnswer_versionId_cvid_idx";

-- CreateIndex
CREATE INDEX "BizAnswer_contentId_cvid_bizUserId_idx" ON "BizAnswer"("contentId", "cvid", "bizUserId");

-- CreateIndex
CREATE INDEX "BizAnswer_versionId_cvid_bizUserId_idx" ON "BizAnswer"("versionId", "cvid", "bizUserId");
