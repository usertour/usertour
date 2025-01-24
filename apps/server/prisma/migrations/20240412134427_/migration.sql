/*
  Warnings:

  - Made the column `versionId` on table `Step` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Step" DROP CONSTRAINT "Step_versionId_fkey";

-- AlterTable
ALTER TABLE "Step" ALTER COLUMN "versionId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Step" ADD CONSTRAINT "Step_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
