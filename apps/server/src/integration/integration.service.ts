import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_AMPLITUDE_EVENT } from '@/common/consts/queen';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    @InjectQueue(QUEUE_AMPLITUDE_EVENT) private amplitudeQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async trackEvent(data: any): Promise<any> {
    const { environmentId } = data;

    // Get Amplitude integration
    const integration = await this.prisma.integration.findMany({
      where: {
        environmentId,
        enabled: true,
      },
    });
    if (integration.find((i) => i.code === 'amplitude')) {
      await this.amplitudeQueue.add('trackEvent', data);
      return;
    }
  }
}
