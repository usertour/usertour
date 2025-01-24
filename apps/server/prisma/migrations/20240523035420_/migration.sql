-- CreateTable
CREATE TABLE "BizUserOnSegment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "segmentId" TEXT NOT NULL,
    "bizUserId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "BizUserOnSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BizUserOnSegment_bizUserId_idx" ON "BizUserOnSegment"("bizUserId");

-- CreateIndex
CREATE UNIQUE INDEX "BizUserOnSegment_segmentId_bizUserId_key" ON "BizUserOnSegment"("segmentId", "bizUserId");

-- AddForeignKey
ALTER TABLE "BizUserOnSegment" ADD CONSTRAINT "BizUserOnSegment_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizUserOnSegment" ADD CONSTRAINT "BizUserOnSegment_bizUserId_fkey" FOREIGN KEY ("bizUserId") REFERENCES "BizUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
