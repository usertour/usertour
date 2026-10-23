import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import * as opentelemetry from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { SocketIoInstrumentation } from '@opentelemetry/instrumentation-socket.io';

const createExporter = (endpoint: string | undefined, path: string) => {
  if (!endpoint) return undefined;
  return { url: `${endpoint}${path}` };
};

const tracesConfig = createExporter(process.env.OTLP_TRACES_ENDPOINT, '/v1/traces');
const metricsConfig = createExporter(process.env.OTLP_METRICS_ENDPOINT, '/v1/metrics');

// Telemetry exists only where something collects it. Without an endpoint the
// SDK is not built at all: registering the instrumentations alone patches
// every hot path (http, Redis, socket.io) and makes the Prisma query engine
// produce a trace for every query — work that was thrown away, measured at a
// full engine thread under a reconnect burst.
const sdk =
  tracesConfig || metricsConfig
    ? new opentelemetry.NodeSDK({
        ...(tracesConfig && {
          traceExporter: new OTLPTraceExporter(tracesConfig),
        }),
        ...(metricsConfig && {
          metricReader: new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter(metricsConfig),
            exportIntervalMillis: 1000,
          }),
        }),
        instrumentations: [
          getNodeAutoInstrumentations(),
          new PrismaInstrumentation(),
          new SocketIoInstrumentation({ enabled: true }),
        ],
        resource: resourceFromAttributes({
          'service.name': 'usertour-server',
        }),
      })
    : undefined;

// initialize the SDK and register with the OpenTelemetry API
// this enables the API to record telemetry
export const startTracer = () => {
  if (!sdk) {
    console.log('OpenTelemetry disabled: no OTLP endpoint configured');
    return;
  }
  try {
    sdk.start();
    console.log('OpenTelemetry tracer started successfully');
  } catch (error) {
    console.warn('OpenTelemetry SDK already initialized, skipping:', error.message);
  }
};

// gracefully shut down the SDK on process exit
if (sdk) {
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
}

export default sdk;
