-- Webhook circuit breaker, cooldown layer (ADR 0010): a streak counter and a
-- skip-until timestamp on the endpoint row (persisted state, dashboard-visible,
-- consistent across instances).
-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cooldownUntil" TIMESTAMPTZ(6);

