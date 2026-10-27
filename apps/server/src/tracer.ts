import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { config as readEnvFile } from 'dotenv';

// This module is the first thing main.ts loads, and it starts the SDK while
// loading: an instrumentation patches a module as that module is required,
// so the instrumentations must be registered before the framework, the
// drivers and the application are. That is also before the application reads
// `.env`, so it is read here, as written: what the environment already holds
// is kept, and `${...}` references are left for the application's
// configuration to expand, once, like everywhere else. The OTEL_* values
// are therefore taken literally.
readEnvFile();

// The SDK configures itself from the standard OTEL_* variables: where to
// send (OTEL_EXPORTER_OTLP_ENDPOINT, or per signal
// OTEL_EXPORTER_OTLP_TRACES_ENDPOINT / OTEL_EXPORTER_OTLP_METRICS_ENDPOINT),
// how (OTEL_EXPORTER_OTLP_PROTOCOL, OTEL_EXPORTER_OTLP_HEADERS), which
// signals (OTEL_TRACES_EXPORTER / OTEL_METRICS_EXPORTER: otlp, console,
// none), how often (OTEL_METRIC_EXPORT_INTERVAL) and as whom
// (OTEL_SERVICE_NAME, OTEL_RESOURCE_ATTRIBUTES). The one thing it does not
// decide is whether to exist: with nothing set it would export to
// localhost:4318. Here, telemetry exists only where something collects it.
const CONFIGURING_VARIABLES = [
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT',
  'OTEL_EXPORTER_OTLP_METRICS_ENDPOINT',
  'OTEL_TRACES_EXPORTER',
  'OTEL_METRICS_EXPORTER',
];

const names = (variable: string): boolean => {
  const value = process.env[variable]?.trim();
  return value !== undefined && value !== '' && value !== 'none';
};

const configured = process.env.OTEL_SDK_DISABLED !== 'true' && CONFIGURING_VARIABLES.some(names);

// Without a collector the SDK is not built at all: registering the
// instrumentations alone patches every hot path (http, Redis, socket.io),
// and that is work on every request with nobody to collect the result.
const sdk = configured
  ? new NodeSDK({
      instrumentations: [
        getNodeAutoInstrumentations({
          // A span per GraphQL field is noise: a trivial resolver reads a
          // property in microseconds, and a list repeats that per item.
          '@opentelemetry/instrumentation-graphql': {
            ignoreTrivialResolveSpans: true,
            mergeItems: true,
          },
        }),
        // Inert on this Prisma line: the 5.x client emits only with its
        // `tracing` preview feature, whose span delivery is written against
        // the 1.x OpenTelemetry SDK, and this SDK is 2.x. Queries join the
        // traces once Prisma is on 6, where tracing is stable.
        new PrismaInstrumentation(),
      ],
      // The name when OTEL_SERVICE_NAME is not set: the attributes detected
      // from the environment merge over this resource.
      resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'usertour-server' }),
    })
  : undefined;

if (sdk) {
  try {
    sdk.start();
    console.log('OpenTelemetry started');
  } catch (error) {
    // A misconfigured exporter costs the telemetry, never the service.
    console.warn('OpenTelemetry not started:', (error as Error).message);
  }
  // Flush what is buffered when the process is told to stop. The
  // application's own shutdown hooks close it, then raise the signal again
  // for the default action to end the process; that default only applies
  // when no listener is left, so this one must be gone by then.
  process.once('SIGTERM', () => {
    void sdk.shutdown().catch((error) => console.log('Error terminating tracing', error));
  });
} else {
  console.log('OpenTelemetry off: no OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_*_EXPORTER set');
}
