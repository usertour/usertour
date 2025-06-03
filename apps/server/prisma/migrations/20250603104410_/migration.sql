-- AlterTable
ALTER TABLE "Segment" ADD COLUMN     "source" TEXT DEFAULT 'internal',
ADD COLUMN     "sourceId" TEXT;
