-- AlterTable
ALTER TABLE "Attribute" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'internal';

-- CreateTable
CREATE TABLE "IntegrationObjectMapping" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceObjectType" TEXT NOT NULL,
    "destinationObjectType" TEXT NOT NULL,
    "settings" JSONB,
    "isSyncing" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMPTZ,
    "integrationId" TEXT NOT NULL,

    CONSTRAINT "IntegrationObjectMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationObjectMapping_integrationId_sourceObjectType_des_key" ON "IntegrationObjectMapping"("integrationId", "sourceObjectType", "destinationObjectType");

-- AddForeignKey
ALTER TABLE "IntegrationObjectMapping" ADD CONSTRAINT "IntegrationObjectMapping_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
