-- CreateTable BizAnnouncementSeen: per-(user, announcement) read state.
-- The unique key makes marking seen idempotent (INSERT .. ON CONFLICT DO
-- NOTHING), replacing the event-stream membership check.
CREATE TABLE "BizAnnouncementSeen" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bizUserId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,

    CONSTRAINT "BizAnnouncementSeen_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BizAnnouncementSeen_bizUserId_contentId_key" ON "BizAnnouncementSeen"("bizUserId", "contentId");

CREATE INDEX "BizAnnouncementSeen_contentId_idx" ON "BizAnnouncementSeen"("contentId");

ALTER TABLE "BizAnnouncementSeen"
  ADD CONSTRAINT "BizAnnouncementSeen_bizUserId_fkey"
  FOREIGN KEY ("bizUserId") REFERENCES "BizUser"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
