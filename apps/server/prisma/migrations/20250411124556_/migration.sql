-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "subscriptionId" TEXT;

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "lookupKey" TEXT NOT NULL,
    "mauQuota" INTEGER NOT NULL DEFAULT 3000,
    "sessionCountQuota" INTEGER NOT NULL DEFAULT 5000,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "lookupKey" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "overridePlan" JSONB,
    "cancelAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lookupKey" TEXT NOT NULL,
    "paymentStatus" TEXT,
    "subscriptionId" TEXT,
    "invoiceId" TEXT,
    "customerId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_planType_interval_key" ON "SubscriptionPlan"("planType", "interval");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_subscriptionId_key" ON "Subscription"("subscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_projectId_idx" ON "Subscription"("projectId");

-- CreateIndex
CREATE INDEX "Subscription_status_cancelAt_idx" ON "Subscription"("status", "cancelAt");

-- CreateIndex
CREATE INDEX "CheckoutSession_sessionId_idx" ON "CheckoutSession"("sessionId");
