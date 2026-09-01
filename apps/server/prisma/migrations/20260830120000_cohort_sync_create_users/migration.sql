-- Cohort members without a matching user are now CREATED as bare users
-- instead of skipped (ADR 0012), so the counter narrows to members whose
-- identity could not be extracted from the wire object at all.
ALTER TABLE "IntegrationSyncedSegment" RENAME COLUMN "unmatchedCount" TO "unresolvedCount";
