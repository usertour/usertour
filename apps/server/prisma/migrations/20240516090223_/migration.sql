-- AlterTable
ALTER TABLE "BizUser" ALTER COLUMN "data" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "bizType" INTEGER NOT NULL DEFAULT 1,
    "dataType" INTEGER NOT NULL DEFAULT 1,
    "environmentId" TEXT NOT NULL,
    "data" JSONB,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
