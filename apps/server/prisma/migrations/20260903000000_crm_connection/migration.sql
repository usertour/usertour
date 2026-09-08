-- CRM connection (ADR 0013 §3): OAuth grant, provider account id and
-- system-owned remote bookkeeping on the integration row.
ALTER TABLE "Integration" ADD COLUMN "oauthCredentials" TEXT,
                          ADD COLUMN "remoteAccountId" TEXT,
                          ADD COLUMN "remoteState" JSONB NOT NULL DEFAULT '{}';

-- Provider-owned attributes (ADR 0013 §6): the provider-side field name.
ALTER TABLE "Attribute" ADD COLUMN "sourceId" TEXT;
