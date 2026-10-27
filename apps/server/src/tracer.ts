import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { SocketIoInstrumentation } from '@opentelemetry/instrumentation-socket.io';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { config as readEnvFile } from 'dotenv';
import { expand } from 'dotenv-expand';

// This module is the first thing main.ts loads, and it starts the SDK while
// loading: an instrumentation patches a module as that module is required,
// so the instrumentations must be registered before the framework, the
// drivers and the application are. That is also before the application reads
// `.env`, so it is read here the same way the application does (expanded
// with the same library; what the environment already holds is kept).
expand(readEnvFile());

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
// instrumentations alone patches every hot path (http, Redis, socket.io) and
// makes the Prisma query engine produce a trace for every query — work that
// was thrown away, measured at a full engine thread under a reconnect burst.
const sdk = configured
  ? new NodeSDK({
      instrumentations: [
        getNodeAutoInstrumentations(),
        new PrismaInstrumentation(),
        new SocketIoInstrumentation({ enabled: true }),
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
  // application's own shutdown hooks close it and end the process; this
  // must not exit it.
  process.on('SIGTERM', () => {
    void sdk.shutdown().catch((error) => console.log('Error terminating tracing', error));
  });
} else {
  console.log('OpenTelemetry off: no OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_*_EXPORTER set');
}
