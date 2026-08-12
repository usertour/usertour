-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "allowedEnvironmentIds" JSONB;

-- AlterTable
ALTER TABLE "UserOnProject" ADD COLUMN     "allowedEnvironmentIds" JSONB;
