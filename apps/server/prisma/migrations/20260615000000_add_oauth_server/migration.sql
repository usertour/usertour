-- AlterTable
ALTER TABLE "ApiToken" ADD COLUMN "oauthGrantId" TEXT;

-- CreateIndex
CREATE INDEX "ApiToken_oauthGrantId_idx" ON "ApiToken"("oauthGrantId");

-- CreateTable
CREATE TABLE "OAuthClient" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "clientType" TEXT NOT NULL,
    "clientSecretHash" TEXT,
    "name" TEXT NOT NULL,
    "redirectUris" JSONB NOT NULL,
    "grantTypes" JSONB NOT NULL,
    "logoUri" TEXT,
    "clientUri" TEXT,
    "registrationAccessTokenHash" TEXT,
    "createdByUserId" TEXT,
    "lastUsedAt" TIMESTAMPTZ(6),

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAuthorizationCode" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hashedCode" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scopes" JSONB NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT,
    "codeChallengeMethod" TEXT,
    "grantId" TEXT NOT NULL,
    "resource" TEXT,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "consumedAt" TIMESTAMPTZ(6),

    CONSTRAINT "OAuthAuthorizationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthGrant" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scopes" JSONB NOT NULL,
    "hashedRefreshToken" TEXT,
    "refreshExpiresAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),

    CONSTRAINT "OAuthGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthClient_registrationAccessTokenHash_key" ON "OAuthClient"("registrationAccessTokenHash");

-- CreateIndex
CREATE INDEX "OAuthClient_createdByUserId_idx" ON "OAuthClient"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAuthorizationCode_hashedCode_key" ON "OAuthAuthorizationCode"("hashedCode");

-- CreateIndex
CREATE INDEX "OAuthAuthorizationCode_clientId_idx" ON "OAuthAuthorizationCode"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthGrant_hashedRefreshToken_key" ON "OAuthGrant"("hashedRefreshToken");

-- CreateIndex
CREATE INDEX "OAuthGrant_userId_clientId_idx" ON "OAuthGrant"("userId", "clientId");

-- CreateIndex
CREATE INDEX "OAuthGrant_clientId_idx" ON "OAuthGrant"("clientId");
