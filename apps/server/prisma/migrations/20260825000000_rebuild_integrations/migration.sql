-- Rebuild integrations on the outbound ledger (ADR 0011). The legacy
-- integration tables belonged to a pipeline that was never reachable from a
-- live code path (hidden menu, dead call site), so their rows are dropped,
-- not migrated: the columns don't line up (plaintext -> encrypted key) and
-- configuration that never took effect carries no user intent worth keeping.

-- DropTable (children of the legacy Integration first)
DROP TABLE IF EXISTS "IntegrationLog";
DROP TABLE IF EXISTS "IntegrationObjectMapping";
DROP TABLE IF EXISTS "IntegrationOAuth";

-- The ledger never held integration rows (the legacy pipeline predates it and
-- never wrote there); delete defensively so re-adding the FK below cannot fail
-- on an orphan.
ALTER TABLE "OutboundMessage" DROP CONSTRAINT "OutboundMessage_integrationId_fkey";
DELETE FROM "OutboundMessage" WHERE "integrationId" IS NOT NULL;

-- DropTable
DROP TABLE "Integration";

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "environmentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "keyTail" TEXT NOT NULL DEFAULT '',
    "config" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "cooldownUntil" TIMESTAMPTZ(6),
    "failingSince" TIMESTAMPTZ(6),
    "autoDisabledAt" TIMESTAMPTZ(6),

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Integration_environmentId_provider_key" ON "Integration"("environmentId", "provider");

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
