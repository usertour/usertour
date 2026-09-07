-- CreateTable
CREATE TABLE "IntegrationSyncRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "integrationId" TEXT NOT NULL,
    "mappingId" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sessionId" TEXT,
    "startedAt" TIMESTAMPTZ(6) NOT NULL,
    "finishedAt" TIMESTAMPTZ(6),
    "records" INTEGER NOT NULL DEFAULT 0,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "unresolvedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "IntegrationSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationSyncRun_integrationId_startedAt_idx" ON "IntegrationSyncRun"("integrationId", "startedAt");

-- CreateIndex
CREATE INDEX "IntegrationSyncRun_sessionId_idx" ON "IntegrationSyncRun"("sessionId");

-- AddForeignKey
ALTER TABLE "IntegrationSyncRun" ADD CONSTRAINT "IntegrationSyncRun_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSyncRun" ADD CONSTRAINT "IntegrationSyncRun_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "IntegrationObjectMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;
