import { Injectable } from '@nestjs/common';
import { RedisService } from '@/modules/common/services/redis.service';
import { ProbeHealthIndicator } from './probe-health.indicator';

@Injectable()
export class RedisHealthIndicator extends ProbeHealthIndicator {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  // getClient() throws when the client is not up; inside an async function
  // that becomes a rejection the base class handles like any other.
  protected async probe(): Promise<string> {
    return await this.redisService.getClient().ping();
  }
}
