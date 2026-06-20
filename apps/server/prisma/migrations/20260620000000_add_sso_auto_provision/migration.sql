-- Invite-required by default: SSO only grants new team access when this is on.
ALTER TABLE "ProjectSsoSettings" ADD COLUMN "autoProvision" BOOLEAN NOT NULL DEFAULT false;
