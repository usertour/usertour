-- CRM email matching (ADR 0013 §5, §12): pairing pages of provider contacts
-- by email looks users up by a JSON key; without this expression index every
-- page seq-scans BizUser. Expression indexes are not representable in the
-- Prisma schema — this migration is their only definition.
CREATE INDEX "BizUser_environmentId_email_idx"
    ON "BizUser" ("environmentId", (lower("data"->>'email')));
