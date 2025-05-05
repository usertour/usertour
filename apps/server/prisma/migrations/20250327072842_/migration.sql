-- CreateTable
CREATE TABLE "BizAnswer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "bizEventId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "cvid" TEXT NOT NULL,
    "numberAnswer" INTEGER,
    "textAnswer" TEXT,
    "listAnswer" TEXT[],

    CONSTRAINT "BizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BizAnswer_contentId_cvid_idx" ON "BizAnswer"("contentId", "cvid");
