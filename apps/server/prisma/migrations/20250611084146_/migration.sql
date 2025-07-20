-- CreateTable
CREATE TABLE "IntegrationOAuth" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "scope" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,

    CONSTRAINT "IntegrationOAuth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationOAuth_integrationId_key" ON "IntegrationOAuth"("integrationId");

-- CreateIndex
CREATE INDEX "IntegrationOAuth_integrationId_idx" ON "IntegrationOAuth"("integrationId");

-- AddForeignKey
ALTER TABLE "IntegrationOAuth" ADD CONSTRAINT "IntegrationOAuth_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
