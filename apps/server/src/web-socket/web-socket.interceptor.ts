import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import api from '@opentelemetry/api';

@Injectable()
export class WebSocketPerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WebSocketPerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;

    return next.handle().pipe(
      tap({
        next: () => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          // Create meter and histogram inside next() execution context
          const meter = api.metrics.getMeter('usertour-websocket-interceptor', '1.0.0');

          // Generate dynamic metric name
          const metricName = `websocket_${methodName.toLowerCase()}_duration_milliseconds`;

          const durationHistogram = meter.createHistogram(metricName, {
            description: `WebSocket ${methodName} method processing duration`,
            unit: 'ms',
          });

          // Record success metrics
          durationHistogram.record(duration, {
            method: methodName,
            class: className,
            status: 'success',
          });

          // Log performance data
          this.logger.log(`[WS] ${className}.${methodName} - Completed in ${duration}ms`);
        },
        error: (error) => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          // Create meter and histogram inside next() execution context
          const meter = api.metrics.getMeter('usertour-websocket-interceptor', '1.0.0');

          // Generate dynamic metric name
          const metricName = `websocket_${methodName.toLowerCase()}_duration_milliseconds`;

          const durationHistogram = meter.createHistogram(metricName, {
            description: `WebSocket ${methodName} method processing duration`,
            unit: 'ms',
          });

          // Record error metrics
          durationHistogram.record(duration, {
            method: methodName,
            class: className,
            status: 'error',
            error_type: error.constructor.name,
          });

          this.logger.error(
            `[WS] ${className}.${methodName} - Failed after ${duration}ms: ${error.message}`,
          );
        },
      }),
    );
  }
}
