-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'VIEWER';

-- AlterTable
ALTER TABLE "Register" ADD COLUMN     "projectId" TEXT;

-- AddForeignKey
ALTER TABLE "Register" ADD CONSTRAINT "Register_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
