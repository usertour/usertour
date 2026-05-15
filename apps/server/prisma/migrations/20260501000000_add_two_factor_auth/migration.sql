-- AlterTable User: 2FA columns
ALTER TABLE "User"
  ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "twoFactorSecret" TEXT,
  ADD COLUMN "twoFactorEnabledAt" TIMESTAMPTZ(6);

-- AlterTable InstanceSetting: instance-level enforce toggle
ALTER TABLE "InstanceSetting"
  ADD COLUMN "require2FA" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable TwoFactorRecoveryCode
CREATE TABLE "TwoFactorRecoveryCode" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "hashedCode" TEXT NOT NULL,
    "usedAt" TIMESTAMPTZ(6),

    CONSTRAINT "TwoFactorRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TwoFactorRecoveryCode_userId_idx" ON "TwoFactorRecoveryCode"("userId");

ALTER TABLE "TwoFactorRecoveryCode"
  ADD CONSTRAINT "TwoFactorRecoveryCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
