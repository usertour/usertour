import { Logger } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { withTimeout } from './with-timeout';

// One probe, bounded in time, reported two ways: the public response carries
// only up or down, and the reason goes to the log. The readiness endpoint
// needs no login, and a dependency's error names internal hosts and
// database users, which belong in the deploy log and nowhere else.
export abstract class ProbeHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(ProbeHealthIndicator.name);

  protected abstract probe(): Promise<unknown>;

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await withTimeout(this.probe(), key);
      return this.getStatus(key, true);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Health check: ${key} is down: ${reason}`);
      throw new HealthCheckError(`${key} check failed`, this.getStatus(key, false));
    }
  }
}
