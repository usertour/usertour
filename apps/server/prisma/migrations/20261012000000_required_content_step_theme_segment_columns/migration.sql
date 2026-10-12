-- Columns every writer fills and every reader already treats as present
-- become NOT NULL, with the defaults the writers assume. Rows a self-hosted
-- instance may still hold with NULL are backfilled first, where a value
-- exists that means "unset": the empty name, the empty object or list, the
-- internal source, the creation time. Content.environmentId and Step.type
-- have no such value; a NULL there was already unreadable through the API,
-- so they are tightened as they are.

UPDATE "Content" SET "name" = '' WHERE "name" IS NULL;
ALTER TABLE "Content" ALTER COLUMN "name" SET NOT NULL, ALTER COLUMN "name" SET DEFAULT '';

UPDATE "Content" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL;
ALTER TABLE "Content" ALTER COLUMN "publishedAt" SET NOT NULL;

ALTER TABLE "Content" ALTER COLUMN "environmentId" SET NOT NULL;

UPDATE "Step" SET "name" = '' WHERE "name" IS NULL;
ALTER TABLE "Step" ALTER COLUMN "name" SET NOT NULL, ALTER COLUMN "name" SET DEFAULT '';

ALTER TABLE "Step" ALTER COLUMN "type" SET NOT NULL;

UPDATE "Step" SET "setting" = '{}' WHERE "setting" IS NULL;
ALTER TABLE "Step" ALTER COLUMN "setting" SET NOT NULL, ALTER COLUMN "setting" SET DEFAULT '{}';

UPDATE "Step" SET "data" = '[]' WHERE "data" IS NULL;
ALTER TABLE "Step" ALTER COLUMN "data" SET NOT NULL, ALTER COLUMN "data" SET DEFAULT '[]';

UPDATE "Step" SET "target" = '{}' WHERE "target" IS NULL;
ALTER TABLE "Step" ALTER COLUMN "target" SET NOT NULL, ALTER COLUMN "target" SET DEFAULT '{}';

UPDATE "Theme" SET "settings" = '{}' WHERE "settings" IS NULL;
ALTER TABLE "Theme" ALTER COLUMN "settings" SET NOT NULL, ALTER COLUMN "settings" SET DEFAULT '{}';

UPDATE "Segment" SET "source" = 'internal' WHERE "source" IS NULL;
ALTER TABLE "Segment" ALTER COLUMN "source" SET NOT NULL;

-- A required relation restricts the parent's deletion instead of nulling the
-- child; environments are only ever soft-deleted, so the rule never fires.
ALTER TABLE "Content" DROP CONSTRAINT "Content_environmentId_fkey";
ALTER TABLE "Content" ADD CONSTRAINT "Content_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
