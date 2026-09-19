-- Locales are soft-deleted: removing one keeps every version's translation rows
-- so it can be restored. Existing rows are live, hence the false default; no
-- backfill is needed.
ALTER TABLE "Localization" ADD COLUMN "deleted" BOOLEAN NOT NULL DEFAULT false;
