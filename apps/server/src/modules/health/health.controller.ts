import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { DatabaseHealthIndicator } from './database-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';

// The two health answers, kept apart because a platform acts on them
// differently.
//
// Liveness (/api/health) says the process is up and nothing more. It stays
// dependency-free on purpose: a monitor that restarts on a failed liveness
// check would, on an outage of a dependency every replica shares, restart
// every replica at once and turn a short outage into a longer one.
//
// Readiness (/api/health/ready) is what the deploy-time healthcheck reads:
// ok only when the database (over the pooled runtime connection, which the
// boot-time migration never exercises) and Redis answer from this process.
// A replica that cannot reach them yet, such as a fresh container whose
// private network is still coming up, is not handed the traffic while the
// replica it replaces can still serve.
@Controller('api/health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.database.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
    ]);
  }
}
