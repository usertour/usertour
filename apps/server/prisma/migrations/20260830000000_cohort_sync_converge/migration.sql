-- Convergence (ADR 0012): a provider cohort materializes as ONE segment per
-- project; every environment's integration syncing that cohort feeds it
-- through its own mapping row. The mapping→segment link becomes many-to-one.
DROP INDEX "IntegrationSyncedSegment_segmentId_key";

-- CreateIndex
CREATE INDEX "IntegrationSyncedSegment_segmentId_idx" ON "IntegrationSyncedSegment"("segmentId");

-- Hygiene before the unique index: provider-source values without a live
-- mapping predate this feature (the source columns are older than it) and
-- would both desynchronize the UI's synced check and, when duplicated, make
-- the index build abort mid-upgrade. Reset them to ordinary segments.
UPDATE "Segment" SET "source" = 'internal', "sourceId" = NULL
WHERE "sourceId" IS NOT NULL
  AND "id" NOT IN (SELECT "segmentId" FROM "IntegrationSyncedSegment");

-- One materialized segment per (project, provider, cohort). Internal segments
-- carry a NULL sourceId and never collide (Postgres treats NULLs as distinct).
CREATE UNIQUE INDEX "Segment_projectId_source_sourceId_key" ON "Segment"("projectId", "source", "sourceId");
