-- CreateTable
CREATE TABLE "BizSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "bizUserId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,

    CONSTRAINT "BizSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "data" JSONB,
    "bizUserId" TEXT NOT NULL,
    "bizSessionId" TEXT,

    CONSTRAINT "BizEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BizSession_bizUserId_idx" ON "BizSession"("bizUserId");

-- CreateIndex
CREATE INDEX "BizSession_contentId_idx" ON "BizSession"("contentId");

-- CreateIndex
CREATE INDEX "BizEvent_bizUserId_idx" ON "BizEvent"("bizUserId");

-- CreateIndex
CREATE INDEX "BizEvent_bizSessionId_idx" ON "BizEvent"("bizSessionId");

-- AddForeignKey
ALTER TABLE "BizSession" ADD CONSTRAINT "BizSession_bizUserId_fkey" FOREIGN KEY ("bizUserId") REFERENCES "BizUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizSession" ADD CONSTRAINT "BizSession_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizEvent" ADD CONSTRAINT "BizEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizEvent" ADD CONSTRAINT "BizEvent_bizUserId_fkey" FOREIGN KEY ("bizUserId") REFERENCES "BizUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizEvent" ADD CONSTRAINT "BizEvent_bizSessionId_fkey" FOREIGN KEY ("bizSessionId") REFERENCES "BizSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
