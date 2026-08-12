-- Snapshot the publish ledger's display names at write time.
--
-- The record stored actor IDS only and resolved names by joining at read time.
-- OAuth-issued API tokens are replaced on every refresh, so that join started
-- returning null within the hour — and a row carrying an actorName but no token
-- name reads exactly like a hand-made dashboard publish. The ledger degraded to
-- a FALSE attribution rather than a missing one, which a release-ops review
-- caught by reading the same record twice minutes apart.
--
-- Same denormalization `versionSequence` already uses: the audit record must
-- outlive the rows it points at. Existing records keep resolving through the
-- read-time join (the columns are nullable and the read side falls back).
ALTER TABLE "ContentPublishRecord" ADD COLUMN "actorName" TEXT;
ALTER TABLE "ContentPublishRecord" ADD COLUMN "actorTokenName" TEXT;
ALTER TABLE "ContentPublishRecord" ADD COLUMN "environmentName" TEXT;
