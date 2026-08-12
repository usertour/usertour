-- AlterTable
ALTER TABLE "OAuthGrant" ADD COLUMN     "previousHashedRefreshToken" TEXT,
ADD COLUMN     "rotatedAt" TIMESTAMPTZ(6);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthGrant_previousHashedRefreshToken_key" ON "OAuthGrant"("previousHashedRefreshToken");
