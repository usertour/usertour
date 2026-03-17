ALTER TABLE "InstanceSetting"
ADD COLUMN "name" TEXT,
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "allowUserRegistration" BOOLEAN NOT NULL DEFAULT true;
