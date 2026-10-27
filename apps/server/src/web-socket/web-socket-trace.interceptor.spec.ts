import { CallHandler, ExecutionContext } from '@nestjs/common';
import api, { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { node, tracing } from '@opentelemetry/sdk-node';
import { defer, lastValueFrom, throwError } from 'rxjs';
import { WebSocketTraceInterceptor } from './web-socket-trace.interceptor';

const exporter = new tracing.InMemorySpanExporter();
const provider = new node.NodeTracerProvider({
  spanProcessors: [new tracing.SimpleSpanProcessor(exporter)],
});

const contextFor = (data: unknown): ExecutionContext =>
  ({
    switchToWs: () => ({ getData: () => data, getPattern: () => 'client-message' }),
    getHandler: () => ({ name: 'handleClientMessage' }),
  }) as unknown as ExecutionContext;

describe('WebSocketTraceInterceptor', () => {
  const interceptor = new WebSocketTraceInterceptor();

  beforeAll(() => {
    // Registers the tracer provider and the context manager the spans need
    // to find their parent across awaits, as the SDK does in the application.
    provider.register();
  });

  afterAll(async () => {
    await provider.shutdown();
    api.trace.disable();
    api.context.disable();
  });

  beforeEach(() => {
    exporter.reset();
  });

  it('names the span by the message kind and makes it the parent of what the handler does', async () => {
    const next: CallHandler = {
      handle: () =>
        defer(async () => {
          await Promise.resolve();
          api.trace.getTracer('test').startSpan('query').end();
          return 'ok';
        }),
    };
    await expect(
      lastValueFrom(interceptor.intercept(contextFor({ kind: 'EndBatch' }), next)),
    ).resolves.toBe('ok');

    const spans = exporter.getFinishedSpans();
    const message = spans.find((span) => span.name === 'EndBatch');
    const query = spans.find((span) => span.name === 'query');
    expect(message?.kind).toBe(SpanKind.CONSUMER);
    expect(message?.attributes['messaging.socket.io.event_name']).toBe('client-message');
    expect(message?.status.code).toBe(SpanStatusCode.UNSET);
    expect(query?.parentSpanContext?.spanId).toBe(message?.spanContext().spanId);
  });

  it('records a failure on the span and still ends it', async () => {
    const next: CallHandler = { handle: () => throwError(() => new Error('boom')) };
    await expect(
      lastValueFrom(interceptor.intercept(contextFor({ kind: 'UpsertUser' }), next)),
    ).rejects.toThrow('boom');

    const [span] = exporter.getFinishedSpans();
    expect(span.name).toBe('UpsertUser');
    expect(span.status).toEqual({ code: SpanStatusCode.ERROR, message: 'boom' });
    expect(span.events.map((event) => event.name)).toEqual(['exception']);
  });

  it('names the span by the event when the message carries no known kind', async () => {
    // The payload is read before validation: a name comes from it only when
    // it is one of ours, never from whatever the client sent.
    for (const data of ['not an object', { kind: 'x'.repeat(10_000) }, { kind: 42 }]) {
      const next: CallHandler = { handle: () => defer(async () => false) };
      await lastValueFrom(interceptor.intercept(contextFor(data), next));
    }

    expect(exporter.getFinishedSpans().map((span) => span.name)).toEqual([
      'client-message',
      'client-message',
      'client-message',
    ]);
  });
});
