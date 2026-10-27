import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import api, { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { ClientMessageKind } from '@usertour/types';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

/**
 * One span per client message, named by the message kind, with everything
 * the message causes (the queue wait, the handler, each query, each emit)
 * as its children. The socket.io instrumentation cannot provide it: it
 * wraps `Socket.prototype.on`, and the framework registers its message
 * handlers through `addListener`, which it does not wrap.
 */
@Injectable()
export class WebSocketTraceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const host = context.switchToWs();
    const event = host.getPattern();
    const tracer = api.trace.getTracer('usertour-websocket');
    return new Observable((subscriber) => {
      const span = tracer.startSpan(messageKind(host.getData()) ?? event, {
        kind: SpanKind.CONSUMER,
        attributes: {
          'messaging.system': 'socket.io',
          'messaging.socket.io.event_name': event,
        },
      });
      // The handler runs when the observable is subscribed to, so the span is
      // made active around the subscription: that is what the handler and
      // every promise it awaits inherit.
      const subscription = api.context.with(api.trace.setSpan(api.context.active(), span), () =>
        next
          .handle()
          .pipe(
            tap({
              error: (error: Error) => {
                span.recordException(error);
                span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
              },
            }),
            finalize(() => span.end()),
          )
          .subscribe(subscriber),
      );
      return () => subscription.unsubscribe();
    });
  }
}

const knownKinds = new Set<string>(Object.values(ClientMessageKind));

/**
 * The kind of a client message, read before validation: the payload is
 * whatever the client sent, and only a known kind may name a span.
 */
const messageKind = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }
  const { kind } = data as { kind?: unknown };
  return typeof kind === 'string' && knownKinds.has(kind) ? kind : undefined;
};
