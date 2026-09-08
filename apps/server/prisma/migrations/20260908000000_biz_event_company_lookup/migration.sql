-- Company event lookups (user/company detail pages) filter BizEvent by the
-- company id OR by the ids of the company's sessions; the session lookup
-- needs an index on the company. (BizEvent already has one.)
CREATE INDEX "BizSession_bizCompanyId_idx" ON "BizSession"("bizCompanyId");
