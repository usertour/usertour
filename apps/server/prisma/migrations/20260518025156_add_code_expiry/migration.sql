-- Add expiresAt to Code, applying the new 1-hour TTL retroactively to
-- existing rows. Rows whose backfilled expiry is already in the past will
-- naturally fail the expiresAt > now() check on consumption, so legacy
-- reset codes older than an hour are invalidated by this migration.
ALTER TABLE "Code" ADD COLUMN "expiresAt" TIMESTAMPTZ(6);

UPDATE "Code" SET "expiresAt" = "createdAt" + INTERVAL '1 hour';

ALTER TABLE "Code" ALTER COLUMN "expiresAt" SET NOT NULL;
