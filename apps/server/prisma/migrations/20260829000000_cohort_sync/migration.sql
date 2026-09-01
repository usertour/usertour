-- Inbound cohort sync (ADR 0012): the Integration table grows an inbound
-- side (switch, encrypted receive token + sha256 lookup, bridge config), and
-- a mapping table ties each provider-side cohort to the Usertour segment
-- mirroring it. Additive only — no data changes.

-- AlterTable
ALTER TABLE "Integration" ADD COLUMN     "inboundConfig" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "inboundEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inboundToken" TEXT,
ADD COLUMN     "inboundTokenHash" TEXT;

-- CreateTable
CREATE TABLE "IntegrationSyncedSegment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "integrationId" TEXT NOT NULL,
    "sourceCohortId" TEXT NOT NULL,
    "sourceCohortName" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMPTZ(6),
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "unmatchedCount" INTEGER NOT NULL DEFAULT 0,
    "fullSyncSessionId" TEXT,
    "fullSyncStartedAt" TIMESTAMPTZ(6),

    CONSTRAINT "IntegrationSyncedSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Integration_inboundTokenHash_key" ON "Integration"("inboundTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSyncedSegment_segmentId_key" ON "IntegrationSyncedSegment"("segmentId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSyncedSegment_integrationId_sourceCohortId_key" ON "IntegrationSyncedSegment"("integrationId", "sourceCohortId");

-- AddForeignKey
ALTER TABLE "IntegrationSyncedSegment" ADD CONSTRAINT "IntegrationSyncedSegment_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSyncedSegment" ADD CONSTRAINT "IntegrationSyncedSegment_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
