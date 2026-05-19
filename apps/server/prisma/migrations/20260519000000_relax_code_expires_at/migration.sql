-- Drop the NOT NULL constraint on Code.expiresAt so self-hosted upgrades
-- don't need a maintenance window: an old app instance running during a
-- rolling deploy can still INSERT into Code without populating expiresAt.
--
-- Application code always sets expiresAt on create, and read paths filter
-- with `expiresAt > now()`, so any rows written without expiresAt during
-- the upgrade window are treated as expired (recoverable by the user via
-- requesting a new reset link).
ALTER TABLE "Code" ALTER COLUMN "expiresAt" DROP NOT NULL;
