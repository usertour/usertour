-- AlterTable
ALTER TABLE "Environment" ADD COLUMN     "deleteded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Theme" ADD COLUMN     "deleteded" BOOLEAN NOT NULL DEFAULT false;
