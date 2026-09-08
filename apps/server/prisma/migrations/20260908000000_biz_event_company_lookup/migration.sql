-- Company event lookups (user/company detail pages) filter BizEvent by the
-- company id OR by the ids of the company's sessions. Both branches now hit
-- an index: sessions by company, events by company with the sort key.
CREATE INDEX "BizSession_bizCompanyId_idx" ON "BizSession"("bizCompanyId");

CREATE INDEX "BizEvent_bizCompanyId_createdAt_idx" ON "BizEvent"("bizCompanyId", "createdAt");

DROP INDEX "BizEvent_bizCompanyId_idx";
