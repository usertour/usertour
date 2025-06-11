-- AlterTable
ALTER TABLE "BizSession" ADD COLUMN     "environmentId" TEXT;

-- CreateTable
CREATE TABLE "ContentOnEnvironment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "environmentId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedVersionId" TEXT NOT NULL,

    CONSTRAINT "ContentOnEnvironment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentOnEnvironment_environmentId_contentId_key" ON "ContentOnEnvironment"("environmentId", "contentId");

-- AddForeignKey
ALTER TABLE "ContentOnEnvironment" ADD CONSTRAINT "ContentOnEnvironment_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentOnEnvironment" ADD CONSTRAINT "ContentOnEnvironment_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentOnEnvironment" ADD CONSTRAINT "ContentOnEnvironment_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizSession" ADD CONSTRAINT "BizSession_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
