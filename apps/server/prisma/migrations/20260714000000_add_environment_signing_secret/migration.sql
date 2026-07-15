-- SDK identity verification (ADR 0008): per-environment HMAC signing secrets
-- plus the enforcement flag on Environment. "At most 2 active secrets per
-- environment" (steady state + rotation slot) is an application-level invariant.
ALTER TABLE "Environment" ADD COLUMN "requireIdentityVerification" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "EnvironmentSigningSecret" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "environmentId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),

    CONSTRAINT "EnvironmentSigningSecret_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnvironmentSigningSecret_secret_key" ON "EnvironmentSigningSecret"("secret");

CREATE INDEX "EnvironmentSigningSecret_environmentId_idx" ON "EnvironmentSigningSecret"("environmentId");

ALTER TABLE "EnvironmentSigningSecret"
  ADD CONSTRAINT "EnvironmentSigningSecret_environmentId_fkey"
  FOREIGN KEY ("environmentId") REFERENCES "Environment"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
