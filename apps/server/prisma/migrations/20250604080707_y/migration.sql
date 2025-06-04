-- DropForeignKey
ALTER TABLE "Content" DROP CONSTRAINT "Content_environmentId_fkey";

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "projectId" TEXT,
ALTER COLUMN "environmentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
