-- CreateTable ProjectSsoSettings
CREATE TABLE "ProjectSsoSettings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "projectId" TEXT NOT NULL,
    "requireSso" BOOLEAN NOT NULL DEFAULT false,
    "defaultRole" "Role" NOT NULL DEFAULT 'ADMIN',
    "allowedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ProjectSsoSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSsoSettings_projectId_key" ON "ProjectSsoSettings"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectSsoSettings"
  ADD CONSTRAINT "ProjectSsoSettings_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Provisioning moves to ProjectSsoSettings (project-level), so drop the
-- per-provider columns. This branch's SSO is unreleased, so no data migration
-- is needed.
ALTER TABLE "ProjectSSOIdentityProvider" DROP COLUMN "defaultRole";
ALTER TABLE "ProjectSSOIdentityProvider" DROP COLUMN "allowedDomains";
