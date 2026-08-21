import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_CLEAN_OUTBOUND_MESSAGES } from '@/common/consts/queen';
import { OutboundLedgerService } from './outbound-ledger.service';

/** Drops ledger rows past the retention window (daily repeatable job). */
@Processor(QUEUE_CLEAN_OUTBOUND_MESSAGES)
export class OutboundCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboundCleanupProcessor.name);

  constructor(private readonly ledger: OutboundLedgerService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const count = await this.ledger.deleteExpired();
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} outbound messages past retention`);
    }
  }
}
