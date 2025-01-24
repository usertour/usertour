/*
  Warnings:

  - Added the required column `versionId` to the `BizSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BizSession" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "versionId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "BizSession" ADD CONSTRAINT "BizSession_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
