-- CRM object mappings and record links (ADR 0013 §4-5).
CREATE TABLE "IntegrationObjectMapping" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "integrationId" TEXT NOT NULL,
    "remoteObject" TEXT NOT NULL,
    "localObject" TEXT NOT NULL,
    "matchStrategy" TEXT NOT NULL DEFAULT 'email',
    "matchRemoteField" TEXT,
    "inboundFields" JSONB NOT NULL DEFAULT '[]',
    "outboundFields" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "fullSyncSessionId" TEXT,
    "fullSyncStartedAt" TIMESTAMPTZ(6),
    "lastFullSyncAt" TIMESTAMPTZ(6),
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "unresolvedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IntegrationObjectMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationObjectLink" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "mappingId" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "matchedBy" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMPTZ(6),

    CONSTRAINT "IntegrationObjectLink_pkey" PRIMARY KEY ("id")
);

-- Prisma names this index with its 63-char Postgres truncation.
CREATE UNIQUE INDEX "IntegrationObjectMapping_integrationId_remoteObject_localOb_key"
    ON "IntegrationObjectMapping"("integrationId", "remoteObject", "localObject");
CREATE UNIQUE INDEX "IntegrationObjectLink_mappingId_localId_key"
    ON "IntegrationObjectLink"("mappingId", "localId");
CREATE UNIQUE INDEX "IntegrationObjectLink_mappingId_remoteId_key"
    ON "IntegrationObjectLink"("mappingId", "remoteId");

ALTER TABLE "IntegrationObjectMapping"
    ADD CONSTRAINT "IntegrationObjectMapping_integrationId_fkey"
    FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationObjectLink"
    ADD CONSTRAINT "IntegrationObjectLink_mappingId_fkey"
    FOREIGN KEY ("mappingId") REFERENCES "IntegrationObjectMapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;
