/*
  Warnings:

  - You are about to drop the column `themeId` on the `Content` table. All the data in the column will be lost.
  - You are about to drop the column `contentId` on the `Step` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[publishedVersionId]` on the table `Content` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[editedVersionId]` on the table `Content` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[versionId,sequence]` on the table `Step` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Content" DROP CONSTRAINT "Content_themeId_fkey";

-- DropForeignKey
ALTER TABLE "Step" DROP CONSTRAINT "Step_contentId_fkey";

-- DropIndex
DROP INDEX "Step_contentId_sequence_key";

-- AlterTable
ALTER TABLE "Content" DROP COLUMN "themeId",
ADD COLUMN     "editedVersionId" TEXT,
ADD COLUMN     "publishedVersionId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'flow';

-- AlterTable
ALTER TABLE "Step" DROP COLUMN "contentId",
ADD COLUMN     "versionId" TEXT;

-- CreateTable
CREATE TABLE "Version" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "themeId" TEXT,
    "contentId" TEXT NOT NULL,
    "data" TEXT,

    CONSTRAINT "Version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Version_contentId_sequence_key" ON "Version"("contentId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Content_publishedVersionId_key" ON "Content"("publishedVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Content_editedVersionId_key" ON "Content"("editedVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Step_versionId_sequence_key" ON "Step"("versionId", "sequence");

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_editedVersionId_fkey" FOREIGN KEY ("editedVersionId") REFERENCES "Version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "Version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Step" ADD CONSTRAINT "Step_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE SET NULL ON UPDATE CASCADE;
