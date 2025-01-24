-- CreateTable
CREATE TABLE "BizCompanyOnSegment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "segmentId" TEXT NOT NULL,
    "bizCompanyId" TEXT NOT NULL,
    "data" JSONB,

    CONSTRAINT "BizCompanyOnSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BizCompanyOnSegment_bizCompanyId_idx" ON "BizCompanyOnSegment"("bizCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "BizCompanyOnSegment_segmentId_bizCompanyId_key" ON "BizCompanyOnSegment"("segmentId", "bizCompanyId");

-- AddForeignKey
ALTER TABLE "BizCompanyOnSegment" ADD CONSTRAINT "BizCompanyOnSegment_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizCompanyOnSegment" ADD CONSTRAINT "BizCompanyOnSegment_bizCompanyId_fkey" FOREIGN KEY ("bizCompanyId") REFERENCES "BizCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
