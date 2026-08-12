-- AlterTable
ALTER TABLE "Version" ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "updatedByUserId" TEXT;

-- CreateTable
CREATE TABLE "ContentPublishRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "versionSequence" INTEGER NOT NULL,
    "environmentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorTokenId" TEXT,

    CONSTRAINT "ContentPublishRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentPublishRecord_contentId_createdAt_idx" ON "ContentPublishRecord"("contentId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContentPublishRecord" ADD CONSTRAINT "ContentPublishRecord_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed one 'publish' record per currently-live (environment, content) so the
-- Publish history panel isn't empty on ship. Actor unknown for historical
-- publishes (left null); timestamp = the live publishedAt.
INSERT INTO "ContentPublishRecord" ("id", "createdAt", "contentId", "versionId", "versionSequence", "environmentId", "action")
SELECT
  'cpr' || md5(random()::text || clock_timestamp()::text || coe."id"),
  COALESCE(coe."publishedAt", now()),
  coe."contentId",
  coe."publishedVersionId",
  v."sequence",
  coe."environmentId",
  'publish'
FROM "ContentOnEnvironment" coe
JOIN "Version" v ON v."id" = coe."publishedVersionId"
WHERE coe."published" = true AND coe."publishedVersionId" IS NOT NULL;
