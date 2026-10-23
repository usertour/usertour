// Reconnect-storm load driver for the websocket v2 gateway.
//
// Opens many SDK-like connections at once against a running server and keeps
// them behaving like the SDK does after a deploy: every connection sends its
// identify batch (BeginBatch, UpsertUser, EndBatch) as soon as it is up, a
// rejected handshake is retried with the SDK's backoff (`retry` mode) or
// abandoned for good (`giveup` mode, the behaviour before ADR 0018), and a
// reconnect asks for one evaluation (EndBatch) like ADR 0018 §5.
//
// Run by hand, never in CI:
//
//   node test/load/handshake-storm.mjs --url http://127.0.0.1:3100 \
//     --token-file /path/to/env-token.txt --clients 400 --mode retry \
//     --duration 120 --server-pid 12345
//
// With --server-pid the driver samples the server's threads every report
// (macOS `ps -M`): a wedged query engine shows as several threads near 100%
// while the connections send nothing.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { io } from 'socket.io-client';

const options = parseArguments(process.argv.slice(2));
const token = options.token ?? readFileSync(options.tokenFile, 'utf8').trim();

const CLIENT_CONTEXT = {
  pageUrl: 'https://example.test/app',
  viewportWidth: 1280,
  viewportHeight: 800,
};

const stats = {
  connected: 0,
  connects: 0,
  reconnects: 0,
  failovers: 0,
  dead: 0,
  handshakeErrors: new Map(),
  messageErrors: new Map(),
  latencies: new Map(),
};

const clients = [];
const startedAt = Date.now();

for (let index = 0; index < options.clients; index += 1) {
  const delay = options.ramp > 0 ? Math.floor((index / options.clients) * options.ramp) : 0;
  setTimeout(() => clients.push(createClient(index)), delay);
}

const reportTimer = setInterval(report, options.reportEvery * 1000);
setTimeout(finish, options.duration * 1000);

function createClient(index) {
  const client = {
    index,
    externalUserId: `${options.userPrefix}-${index}`,
    attempt: 0,
    everConnected: false,
    failedOver: false,
    dead: false,
    socket: null,
  };
  openSocket(client, options.url);
  return client;
}

// One socket per server the client talks to. With --failover-url, a client
// whose server goes away reconnects to the other one after Socket.IO's own
// first reconnection delay (0.5–1.5 s), the way a page lands on another
// replica when its replica restarts or crashes.
function openSocket(client, url) {
  const socket = io(`${url}/v2`, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 20_000,
    auth: {
      token,
      externalUserId: client.externalUserId,
      clientContext: CLIENT_CONTEXT,
    },
  });
  client.socket = socket;
  const current = () => client.socket === socket;
  socket.on('server-message', (_message, acknowledge) => {
    if (typeof acknowledge === 'function') {
      acknowledge(true);
    }
  });
  socket.on('connect', () => {
    if (!current()) {
      return;
    }
    stats.connected += 1;
    stats.connects += 1;
    client.attempt = 0;
    const isReconnect = client.everConnected;
    client.everConnected = true;
    if (isReconnect) {
      stats.reconnects += 1;
    }
    void (isReconnect ? sendReconnectEvaluation(client) : sendIdentifyBatch(client));
  });
  socket.on('connect_error', (error) => {
    if (!current()) {
      return;
    }
    const retryable = error?.data?.retryable;
    const code = error?.data?.code ?? error?.message ?? 'unknown';
    count(stats.handshakeErrors, `${code}${retryable === false ? ' (not retryable)' : ''}`);
    if (options.mode === 'retry' && retryable !== false) {
      scheduleReconnect(client);
    } else {
      markDead(client);
    }
  });
  socket.on('disconnect', (reason) => {
    if (!current()) {
      return;
    }
    stats.connected -= 1;
    if (reason === 'io client disconnect') {
      return;
    }
    if (options.failoverUrl && !client.failedOver) {
      client.failedOver = true;
      stats.failovers += 1;
      setTimeout(
        () => {
          if (!client.dead) {
            openSocket(client, options.failoverUrl);
          }
        },
        Math.round(500 + Math.random() * 1000),
      );
      return;
    }
    if (options.mode === 'retry') {
      scheduleReconnect(client);
    } else {
      markDead(client);
    }
  });
}

async function sendIdentifyBatch(client) {
  await send(client, 'BeginBatch', {});
  await send(client, 'UpsertUser', {
    externalUserId: client.externalUserId,
    attributes: { plan: 'load', name: `Load ${client.index}` },
  });
  await send(client, 'EndBatch', {});
  if (options.loopEvery > 0) {
    scheduleActivity(client);
  }
}

// Sustained page activity after identify: a navigation with changed context
// and a changed attribute, batched and evaluated, like a user moving around
// the host application. Spread by jitter so the clients do not fire in step.
function scheduleActivity(client) {
  const jitter = options.loopEvery * 1000 * (0.5 + Math.random());
  setTimeout(async () => {
    if (client.dead) {
      return;
    }
    if (!client.socket.connected) {
      // Disconnected for now: keep the page's rhythm and try again later.
      scheduleActivity(client);
      return;
    }
    client.activity = (client.activity ?? 0) + 1;
    await send(client, 'BeginBatch', {});
    await send(client, 'UpdateClientContext', {
      ...CLIENT_CONTEXT,
      pageUrl: `https://example.test/app/page-${client.activity % 7}`,
    });
    await send(client, 'UpsertUser', {
      externalUserId: client.externalUserId,
      attributes: { plan: 'load', lastSeenAt: new Date().toISOString() },
    });
    await send(client, 'EndBatch', {});
    scheduleActivity(client);
  }, Math.round(jitter));
}

async function sendReconnectEvaluation(client) {
  await send(client, 'EndBatch', {});
}

async function send(client, kind, payload) {
  const sentAt = Date.now();
  try {
    const ack = await client.socket
      .timeout(30_000)
      .emitWithAck('client-message', { kind, payload });
    if (ack === false) {
      // Answered, but refused: the server did not do the work.
      count(stats.messageErrors, `${kind}: refused`);
      return;
    }
    record(stats.latencies, kind, Date.now() - sentAt);
  } catch (error) {
    count(stats.messageErrors, `${kind}: ${error?.message ?? 'error'}`);
  }
}

function scheduleReconnect(client) {
  if (client.dead) {
    return;
  }
  // ADR 0018 §1: 1 s doubling to a 60 s cap, ±25 % jitter, no attempt limit.
  const base = Math.min(1000 * 2 ** client.attempt, 60_000);
  const jitter = base * 0.25 * (Math.random() * 2 - 1);
  client.attempt += 1;
  setTimeout(
    () => {
      if (!client.dead && !client.socket.connected) {
        client.socket.connect();
      }
    },
    Math.round(base + jitter),
  );
}

function markDead(client) {
  if (!client.dead) {
    client.dead = true;
    stats.dead += 1;
  }
}

function report() {
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  const lines = [
    `[${elapsed}s] connected=${stats.connected} connects=${stats.connects} reconnects=${stats.reconnects} failovers=${stats.failovers} dead=${stats.dead}`,
  ];
  for (const [kind, samples] of stats.latencies) {
    lines.push(
      `  ${kind}: n=${samples.length} p50=${percentile(samples, 50)}ms p95=${percentile(samples, 95)}ms max=${Math.max(...samples)}ms`,
    );
  }
  if (stats.handshakeErrors.size > 0) {
    lines.push(`  handshake errors: ${formatCounts(stats.handshakeErrors)}`);
  }
  if (stats.messageErrors.size > 0) {
    lines.push(`  message errors: ${formatCounts(stats.messageErrors)}`);
  }
  if (options.serverPid) {
    lines.push(`  server threads: ${sampleServerThreads(options.serverPid)}`);
  }
  console.log(lines.join('\n'));
  stats.latencies = new Map();
}

function sampleServerThreads(pid) {
  try {
    const output = execFileSync('ps', ['-M', '-p', String(pid)], { encoding: 'utf8' });
    const loads = output
      .split('\n')
      .slice(1)
      .map((line) => line.match(/\s(\d+\.\d)\s+[A-Z]/))
      .filter(Boolean)
      .map((match) => Number(match[1]))
      .sort((left, right) => right - left);
    const total = loads.reduce((sum, load) => sum + load, 0).toFixed(1);
    const busy = loads.filter((load) => load >= 50).length;
    return `total=${total}% busy(>=50%)=${busy} top=${loads.slice(0, 6).join(',')}`;
  } catch (error) {
    return `unavailable (${error?.message ?? 'error'})`;
  }
}

function finish() {
  clearInterval(reportTimer);
  report();
  console.log('--- summary ---');
  console.log(
    `clients=${options.clients} mode=${options.mode} connects=${stats.connects} reconnects=${stats.reconnects} dead=${stats.dead} connected=${stats.connected}`,
  );
  console.log(`handshake errors: ${formatCounts(stats.handshakeErrors) || 'none'}`);
  console.log(`message errors: ${formatCounts(stats.messageErrors) || 'none'}`);
  for (const client of clients) {
    client.dead = true;
    client.socket.disconnect();
  }
  setTimeout(() => process.exit(0), 500);
}

function record(map, key, value) {
  const samples = map.get(key) ?? [];
  samples.push(value);
  map.set(key, samples);
}

function count(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function formatCounts(map) {
  return [...map.entries()].map(([key, value]) => `${key}=${value}`).join(', ');
}

function percentile(samples, rank) {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor((rank / 100) * sorted.length))];
}

function parseArguments(argv) {
  const parsed = {
    url: 'http://127.0.0.1:3100',
    token: undefined,
    tokenFile: undefined,
    clients: 400,
    mode: 'retry',
    duration: 120,
    ramp: 2000,
    reportEvery: 5,
    loopEvery: 0,
    serverPid: undefined,
    userPrefix: `load-${Date.now()}`,
    failoverUrl: undefined,
  };
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index].replace(/^--/, '');
    const value = argv[index + 1];
    switch (name) {
      case 'url':
        parsed.url = value;
        break;
      case 'token':
        parsed.token = value;
        break;
      case 'token-file':
        parsed.tokenFile = value;
        break;
      case 'clients':
        parsed.clients = Number(value);
        break;
      case 'mode':
        parsed.mode = value;
        break;
      case 'duration':
        parsed.duration = Number(value);
        break;
      case 'ramp':
        parsed.ramp = Number(value);
        break;
      case 'report-every':
        parsed.reportEvery = Number(value);
        break;
      case 'loop-every':
        parsed.loopEvery = Number(value);
        break;
      case 'server-pid':
        parsed.serverPid = Number(value);
        break;
      case 'user-prefix':
        parsed.userPrefix = value;
        break;
      case 'failover-url':
        parsed.failoverUrl = value;
        break;
      default:
        throw new Error(`Unknown option --${name}`);
    }
  }
  if (!parsed.token && !parsed.tokenFile) {
    throw new Error('Pass --token or --token-file');
  }
  if (!['retry', 'giveup'].includes(parsed.mode)) {
    throw new Error('--mode must be retry or giveup');
  }
  return parsed;
}
