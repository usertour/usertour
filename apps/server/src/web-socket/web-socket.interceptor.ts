import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class WebSocketPerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WebSocketPerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;

    this.logger.log(`[WS] ${className}.${methodName} - Started`);

    return next.handle().pipe(
      tap({
        next: () => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          this.logger.log(`[WS] ${className}.${methodName} - Completed in ${duration}ms`);

          // You can also log to external monitoring service here
          this.logPerformanceMetrics(className, methodName, duration, 'success');
        },
        error: (error) => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          this.logger.error(
            `[WS] ${className}.${methodName} - Failed after ${duration}ms: ${error.message}`,
          );

          this.logPerformanceMetrics(className, methodName, duration, 'error');
        },
      }),
    );
  }

  private logPerformanceMetrics(
    className: string,
    methodName: string,
    duration: number,
    status: 'success' | 'error',
  ): void {
    // Here you can send metrics to your monitoring system
    // For example: Prometheus, DataDog, New Relic, etc.

    // Example: Log to console with structured format
    console.log(
      JSON.stringify({
        type: 'websocket_performance',
        timestamp: new Date().toISOString(),
        className,
        methodName,
        duration,
        status,
      }),
    );
  }
}
