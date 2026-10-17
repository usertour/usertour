import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { CommonModule } from '@/modules/common/common.module';
import { DatabaseHealthIndicator } from './database-health.indicator';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis-health.indicator';

@Module({
  // terminus's own error line would repeat the result; the indicators log
  // each failure once, with its reason.
  imports: [TerminusModule.forRoot({ logger: false }), CommonModule],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
