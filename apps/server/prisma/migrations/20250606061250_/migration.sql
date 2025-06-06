-- DropForeignKey
ALTER TABLE "Segment" DROP CONSTRAINT "Segment_environmentId_fkey";

-- AlterTable
ALTER TABLE "Segment" ADD COLUMN     "projectId" TEXT,
ALTER COLUMN "environmentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
