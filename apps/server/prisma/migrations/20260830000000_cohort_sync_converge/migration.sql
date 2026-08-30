-- Convergence (ADR 0012): a provider cohort materializes as ONE segment per
-- project; every environment's integration syncing that cohort feeds it
-- through its own mapping row. The mapping→segment link becomes many-to-one.
DROP INDEX "IntegrationSyncedSegment_segmentId_key";

-- CreateIndex
CREATE INDEX "IntegrationSyncedSegment_segmentId_idx" ON "IntegrationSyncedSegment"("segmentId");

-- One materialized segment per (project, provider, cohort). Internal segments
-- carry a NULL sourceId and never collide (Postgres treats NULLs as distinct).
CREATE UNIQUE INDEX "Segment_projectId_source_sourceId_key" ON "Segment"("projectId", "source", "sourceId");
