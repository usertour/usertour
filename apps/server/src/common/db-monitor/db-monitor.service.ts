import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

interface DetailedConnection {
  pid: number;
  usename: string;
  application_name: string;
  client_addr: string;
  state: string;
  wait_event_type: string;
  wait_event: string;
  query_start: Date;
  query_age: string;
  query_text: string;
}

@Injectable()
export class DbMonitorService implements OnModuleInit {
  private readonly logger = new Logger(DbMonitorService.name);
  private monitorInterval: NodeJS.Timeout;
  private isMonitoring = false;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private lastError: Error | null = null;
  private errorCount = 0;
  private lastCheckTime = 0;
  private connectionHistory: Array<{
    timestamp: string;
    currentConnections: number;
    activeConnections: number;
    idleConnections: number;
  }> = [];
  private readonly MAX_HISTORY = 100; // Keep last 100 data points

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.startMonitoring();
  }

  private async startMonitoring() {
    if (this.isMonitoring) {
      this.logger.warn('Monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.logger.log('Starting database connection monitoring...');

    this.monitorInterval = setInterval(async () => {
      try {
        await this.monitorConnections();
      } catch (error) {
        this.logger.error(error);
      }
    }, 30000); // Check every 30 seconds for local testing
  }

  private async monitorConnections() {
    try {
      // Check if we can connect to the database
      await this.prisma.$queryRaw`SELECT 1`;

      // Get connection limits and current usage
      const limits = await this.prisma.$queryRaw`
        SELECT 
          current_setting('max_connections') as max_connections,
          count(*) as current_connections,
          sum(case when state = 'idle' then 1 else 0 end) as idle_connections,
          sum(case when state != 'idle' then 1 else 0 end) as active_connections,
          sum(case when wait_event_type = 'Lock' then 1 else 0 end) as waiting_connections,
          current_database() as database_name,
          current_user as database_user,
          pg_size_pretty(pg_database_size(current_database())) as database_size,
          count(distinct application_name) as distinct_applications,
          count(distinct client_addr) as distinct_clients,
          count(distinct usename) as distinct_users,
          max(age(now(), query_start)::text) as oldest_query_age,
          sum(case when state = 'idle in transaction' then 1 else 0 end) as idle_in_transaction,
          sum(case when state = 'idle' and age(now(), query_start) > interval '1 hour' then 1 else 0 end) as long_idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;

      const stats = limits[0];
      const maxConnections = Number.parseInt(stats.max_connections, 10);
      const currentConnections = Number.parseInt(stats.current_connections, 10);
      const idleConnections = Number.parseInt(stats.idle_connections, 10);
      const activeConnections = Number.parseInt(stats.active_connections, 10);
      const waitingConnections = Number.parseInt(stats.waiting_connections, 10);
      const idleInTransaction = Number.parseInt(stats.idle_in_transaction, 10);
      const longIdleConnections = Number.parseInt(stats.long_idle_connections, 10);
      const distinctApplications = Number.parseInt(stats.distinct_applications, 10);
      const distinctClients = Number.parseInt(stats.distinct_clients, 10);
      const distinctUsers = Number.parseInt(stats.distinct_users, 10);

      // Update connection history
      this.connectionHistory.push({
        timestamp: new Date().toISOString(),
        currentConnections,
        activeConnections,
        idleConnections,
      });
      if (this.connectionHistory.length > this.MAX_HISTORY) {
        this.connectionHistory.shift();
      }

      // Calculate connection trends
      const recentHistory = this.connectionHistory.slice(-10);
      const connectionTrend =
        recentHistory.length > 1
          ? (currentConnections - recentHistory[0].currentConnections) / (recentHistory.length - 1)
          : 0;

      // Get detailed connection information
      const detailedConnections = await this.prisma.$queryRaw<DetailedConnection[]>`
        SELECT 
          pid,
          usename,
          application_name,
          client_addr,
          state,
          wait_event_type,
          wait_event,
          query_start,
          age(now(), query_start)::text as query_age,
          left(query, 200) as query_text
        FROM pg_stat_activity
        WHERE datname = current_database()
        ORDER BY query_start DESC
        LIMIT 10
      `;

      // Calculate usage percentage
      const usagePercentage = ((currentConnections / maxConnections) * 100).toFixed(2);

      // Log connection status
      this.logger.log({
        timestamp: new Date().toISOString(),
        event: 'database_connection_check',
        status: 'success',
        database: {
          name: stats.database_name,
          user: stats.database_user,
          size: stats.database_size,
        },
        connections: {
          max: maxConnections,
          current: currentConnections,
          idle: idleConnections,
          active: activeConnections,
          waiting: waitingConnections,
          idleInTransaction: idleInTransaction,
          longIdleConnections: longIdleConnections,
          usagePercentage: `${usagePercentage}%`,
          distinctApplications,
          distinctClients,
          distinctUsers,
          oldestQueryAge: stats.oldest_query_age,
          connectionTrend: connectionTrend.toFixed(2),
        },
        activeQueries: detailedConnections.map((conn) => ({
          pid: conn.pid,
          user: conn.usename,
          application: conn.application_name,
          client: conn.client_addr,
          state: conn.state,
          waitEvent: conn.wait_event,
          queryAge: conn.query_age,
          queryText: conn.query_text,
        })),
        metrics: {
          responseTime: `${Date.now() - this.lastCheckTime}ms`,
          retryCount: this.retryCount,
          errorCount: this.errorCount,
        },
        lastError: this.lastError,
      });

      // Check for warnings
      if (longIdleConnections > 0) {
        this.logger.warn(`Found ${longIdleConnections} connections idle for more than 1 hour`);
      }
      if (connectionTrend > 1) {
        this.logger.warn(
          `Connection count is increasing rapidly (trend: ${connectionTrend.toFixed(2)} connections per interval)`,
        );
      }
      if (Number.parseFloat(usagePercentage) > 80) {
        this.logger.warn(`High connection usage: ${usagePercentage}%`);
      }

      // Reset error tracking on successful monitoring
      this.retryCount = 0;
      this.lastError = null;
      this.lastCheckTime = Date.now();
    } catch (error) {
      this.errorCount++;
      this.lastError = error;

      // Log detailed error information
      this.logger.error({
        timestamp: new Date().toISOString(),
        event: 'database_connection_check',
        status: 'error',
        error: {
          message: error.message,
          code: error.code,
          meta: error.meta,
          stack: error.stack,
        },
        metrics: {
          retryCount: this.retryCount,
          errorCount: this.errorCount,
        },
      });

      // Try to reconnect if we've had less than 3 errors
      if (this.retryCount < 3) {
        this.retryCount++;
        this.logger.warn(`Attempting to reconnect to database (attempt ${this.retryCount}/3)`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await this.monitorConnections();
      } else {
        this.logger.error('Maximum retry attempts reached. Stopping monitoring.');
        this.onModuleDestroy();
      }
    }
  }

  onModuleDestroy() {
    this.isMonitoring = false;
    this.retryCount = 0;
    this.errorCount = 0;
    this.lastError = null;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.logger.log(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            event: 'monitoring_stop',
            reason: 'normal_shutdown',
            totalErrors: this.errorCount,
          },
          null,
          2,
        ),
      );
    }
  }
}
