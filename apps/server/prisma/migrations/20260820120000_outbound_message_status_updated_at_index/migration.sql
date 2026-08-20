-- Reconcile sweep support: hourly scan for PENDING messages silent past the
-- orphan threshold must not walk the 30-day ledger.
CREATE INDEX "OutboundMessage_status_updatedAt_idx" ON "OutboundMessage"("status", "updatedAt");
