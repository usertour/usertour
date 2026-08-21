import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_CLEAN_OUTBOUND_MESSAGES } from '@/common/consts/queen';
import { OutboundCleanupProcessor } from './outbound-cleanup.processor';
import { OutboundLedgerService } from './outbound-ledger.service';

/**
 * Outbound delivery ledger shared by every push destination (webhooks now,
 * integrations next). Owns the message/attempt tables and their retention;
 * transports live with their destination modules.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_CLEAN_OUTBOUND_MESSAGES, prefix: 'outbound_cron' }),
  ],
  providers: [OutboundLedgerService, OutboundCleanupProcessor],
  exports: [OutboundLedgerService],
})
export class OutboundModule {}
