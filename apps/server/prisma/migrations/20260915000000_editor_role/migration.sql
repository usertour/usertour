-- Roles redesign (ADR 0014): VIEWER ⊂ EDITOR ⊂ ADMIN ⊂ OWNER.
--
-- 1. The dormant USER enum value becomes EDITOR. Hand-written as a RENAME so
--    the change is metadata-only and transaction-safe (Prisma would generate
--    a destructive drop + re-add of the enum).
ALTER TYPE "Role" RENAME VALUE 'USER' TO 'EDITOR';

-- 2. Every existing ADMIN membership becomes EDITOR. Today's ADMIN is
--    capability-for-capability the new EDITOR plus unrestricted publishing,
--    so the publish whitelist is seeded with the project's live environments
--    (an explicit list, never NULL — NULL now means "may publish nowhere").
--    Nobody holds the new ADMIN role after this; owners promote deliberately.
UPDATE "UserOnProject" AS membership
SET
  "role" = 'EDITOR',
  "allowedEnvironmentIds" = COALESCE(
    (
      SELECT jsonb_agg(environment."id" ORDER BY environment."createdAt")
      FROM "Environment" AS environment
      WHERE environment."projectId" = membership."projectId"
        AND environment."deleted" = false
    ),
    '[]'::jsonb
  )
WHERE membership."role" = 'ADMIN';

-- 3. Pending ADMIN invites join as EDITOR with the same seeded whitelist
--    (an invite created without a restriction meant "all environments").
UPDATE "Invite" AS invite
SET
  "role" = 'EDITOR',
  "allowedEnvironmentIds" = COALESCE(
    invite."allowedEnvironmentIds",
    (
      SELECT jsonb_agg(environment."id" ORDER BY environment."createdAt")
      FROM "Environment" AS environment
      WHERE environment."projectId" = invite."projectId"
        AND environment."deleted" = false
    ),
    '[]'::jsonb
  )
WHERE invite."role" = 'ADMIN';

-- 4. SSO auto-provisioning never hands out ADMIN (team management) any more.
UPDATE "ProjectSsoSettings" SET "defaultRole" = 'EDITOR' WHERE "defaultRole" = 'ADMIN';
ALTER TABLE "ProjectSsoSettings" ALTER COLUMN "defaultRole" SET DEFAULT 'EDITOR';
