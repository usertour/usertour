-- Outbound delivery ledger (ADR 0010 §10): a message row per (destination × message)
-- holding the payload as sent, plus one attempt row per try. Shared by webhooks
-- and (next) integrations — exactly one of webhookId / integrationId is set.
--
-- WebhookDelivery is replaced rather than migrated: its rows were per-attempt
-- metadata without a message to attach to, and the table only ever existed on
-- this feature branch (30-day debug log, no production data).

-- CreateEnum
CREATE TYPE "OutboundMessageStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- DropForeignKey
ALTER TABLE "WebhookDelivery" DROP CONSTRAINT "WebhookDelivery_webhookId_fkey";

-- DropTable
DROP TABLE "WebhookDelivery";

-- CreateTable
CREATE TABLE "OutboundMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "environmentId" TEXT NOT NULL,
    "webhookId" TEXT,
    "integrationId" TEXT,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboundMessageStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundDelivery" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "error" TEXT,
    "durationMs" INTEGER,

    CONSTRAINT "OutboundDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutboundMessage_webhookId_createdAt_idx" ON "OutboundMessage"("webhookId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundMessage_integrationId_createdAt_idx" ON "OutboundMessage"("integrationId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundMessage_createdAt_idx" ON "OutboundMessage"("createdAt");

-- CreateIndex
CREATE INDEX "OutboundDelivery_messageId_createdAt_idx" ON "OutboundDelivery"("messageId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundDelivery_createdAt_idx" ON "OutboundDelivery"("createdAt");

-- AddForeignKey
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "OutboundMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Exactly one destination per message.
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_one_destination_check"
  CHECK (("webhookId" IS NOT NULL)::int + ("integrationId" IS NOT NULL)::int = 1);
