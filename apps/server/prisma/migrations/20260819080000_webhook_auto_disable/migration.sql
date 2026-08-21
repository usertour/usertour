-- Circuit breaker layer 2 (ADR 0010): when a failure streak is older than the
-- auto-disable window, the system flips enabled=false; autoDisabledAt lets the
-- dashboard tell system disables from manual ones.
-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "autoDisabledAt" TIMESTAMPTZ(6),
ADD COLUMN     "failingSince" TIMESTAMPTZ(6);

