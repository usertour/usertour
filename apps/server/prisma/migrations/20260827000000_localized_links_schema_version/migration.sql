-- Format version of the link destinations inside VersionOnLocalization.localized.
-- 0 = row saved before link units existed (its link destinations are verbatim
-- source clones; the seed-time backfill blanks them and stamps the current
-- version). The app stamps the current version on every localized write.
ALTER TABLE "VersionOnLocalization" ADD COLUMN "localizedSchemaVersion" INTEGER NOT NULL DEFAULT 0;
