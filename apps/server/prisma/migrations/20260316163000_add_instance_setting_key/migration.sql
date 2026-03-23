-- AlterTable
ALTER TABLE "InstanceSetting"
ADD COLUMN "key" TEXT NOT NULL DEFAULT 'instance';

-- CreateIndex
CREATE UNIQUE INDEX "InstanceSetting_key_key" ON "InstanceSetting"("key");
