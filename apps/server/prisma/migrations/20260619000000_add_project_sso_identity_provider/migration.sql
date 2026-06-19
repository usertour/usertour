-- CreateEnum
CREATE TYPE "SsoProviderType" AS ENUM ('OIDC', 'SAML');

-- CreateTable ProjectSSOIdentityProvider
CREATE TABLE "ProjectSSOIdentityProvider" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "SsoProviderType" NOT NULL DEFAULT 'OIDC',
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "defaultRole" "Role" NOT NULL,
    "allowedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "issuer" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "authorizationUrl" TEXT,
    "tokenUrl" TEXT,
    "userInfoUrl" TEXT,

    CONSTRAINT "ProjectSSOIdentityProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectSSOIdentityProvider_projectId_idx" ON "ProjectSSOIdentityProvider"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectSSOIdentityProvider"
  ADD CONSTRAINT "ProjectSSOIdentityProvider_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
