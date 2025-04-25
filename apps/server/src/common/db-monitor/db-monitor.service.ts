import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class DbMonitorService implements OnModuleInit {
  private readonly logger = new Logger(DbMonitorService.name);
  private monitorInterval: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.startMonitoring();
  }

  private async startMonitoring() {
    this.monitorInterval = setInterval(async () => {
      try {
        const result = await this.prisma.$queryRaw`
          SELECT 
            pid,
            usename,
            application_name,
            client_addr,
            state,
            query_start,
            age(clock_timestamp(), query_start) as query_age,
            query
          FROM pg_stat_activity
          WHERE state != 'idle'
          ORDER BY query_start DESC
        `;

        this.logger.log('Active database connections:');
        this.logger.log(JSON.stringify(result, null, 2));

        // Log connection count
        const countResult = await this.prisma.$queryRaw`
          SELECT count(*) as total_connections,
                 sum(case when state = 'idle' then 1 else 0 end) as idle_connections,
                 sum(case when state = 'active' then 1 else 0 end) as active_connections,
                 sum(case when state = 'idle in transaction' then 1 else 0 end) as idle_in_transaction
          FROM pg_stat_activity
        `;

        this.logger.log('Connection statistics:');
        this.logger.log(JSON.stringify(countResult, null, 2));
      } catch (error) {
        this.logger.error('Error monitoring database connections:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  onModuleDestroy() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
  }
}
