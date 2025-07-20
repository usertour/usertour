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

    return next.handle().pipe(
      tap({
        next: () => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          this.logger.log(`[WS] ${className}.${methodName} - Completed in ${duration}ms`);
        },
        error: (error) => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          this.logger.error(
            `[WS] ${className}.${methodName} - Failed after ${duration}ms: ${error.message}`,
          );
        },
      }),
    );
  }
}
