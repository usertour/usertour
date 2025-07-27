import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

@Injectable()
export class WebSocketPerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WebSocketPerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;

    // Get socket client for user context
    const client = context.switchToWs().getClient();
    const environment = client?.data?.environment;

    return next.handle().pipe(
      tap({
        next: (result) => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          // Log performance data
          this.logger.log(`[WS] ${className}.${methodName} - Completed in ${duration}ms`);

          // Send performance data to Sentry (if needed)
          if (duration > 1000) {
            // Only report slow operations
            Sentry.captureMessage(
              `Slow WebSocket operation: ${className}.${methodName} took ${duration}ms`,
              {
                level: 'warning',
                tags: {
                  type: 'websocket',
                  class: className,
                  method: methodName,
                  duration: duration.toString(),
                },
                extra: {
                  environment: environment?.id,
                  result: !!result,
                },
              },
            );
          }
        },
        error: (error) => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          // Capture the error in Sentry
          Sentry.captureException(error, {
            tags: {
              type: 'websocket',
              class: className,
              method: methodName,
            },
            extra: {
              environment: environment?.id,
              duration,
            },
          });

          this.logger.error(
            `[WS] ${className}.${methodName} - Failed after ${duration}ms: ${error.message}`,
          );
        },
      }),
    );
  }
}
