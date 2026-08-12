-- AlterTable
ALTER TABLE "ApiToken" ADD COLUMN     "allowedEnvironmentIds" JSONB;

-- AlterTable
ALTER TABLE "OAuthAuthorizationCode" ADD COLUMN     "allowedEnvironmentIds" JSONB;

-- AlterTable
ALTER TABLE "OAuthGrant" ADD COLUMN     "allowedEnvironmentIds" JSONB;
