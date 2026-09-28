import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server, type Socket } from 'socket.io';

/**
 * A real Socket.IO server that speaks only the SDK's wire protocol, with every
 * decision left to the test: whether a handshake is accepted, what a client
 * message is answered with (or that it is not answered at all), when a
 * connection is kicked or its transport dropped. It records everything it saw
 * — each handshake with its credentials, each message with its answer — so a
 * test asserts on what the server received, not on the SDK's own state.
 *
 * It is a real server on purpose: the SDK's connection and replay behaviour
 * is about Socket.IO's actual semantics (buffered emits flushed before
 * `connect`, acknowledgement timeouts, the `active` flag, backoff), which a
 * hand-written fake would get subtly wrong.
 */

export type RejectedKey = { codeName: string; reason: string };
export type UpsertAck = { ok: boolean; rejected: RejectedKey[] };
/**
 * What a client message is answered with: an upsert's `{ ok, rejected }`, a
 * boolean, or the data a query expects back (a list, a record); `silent`
 * leaves the message unacknowledged.
 */
export type Answer = UpsertAck | boolean | 'silent' | Record<string, unknown> | unknown[];

export type ClientMessage = {
  kind: string;
  payload?: Record<string, unknown>;
  requestId?: string;
};

export type Handshake =
  | { accept: true }
  | { accept: false; code: string; retryable: boolean; message?: string };

export type Attempt = { seq: number; auth: Record<string, unknown>; verdict: Handshake };

export type Connection = {
  seq: number;
  id: string;
  auth: Record<string, unknown>;
  connectedAt: number;
  disconnectedAt?: number;
  reason?: string;
  socket: Socket;
};

export type Seen = { seq: number; connection: Connection; message: ClientMessage; answer: Answer };

export type HandshakeRule = (auth: Record<string, unknown>) => Handshake | Promise<Handshake>;
export type AnswerRule = (
  message: ClientMessage,
  connection: Connection,
) => Answer | Promise<Answer>;

const NAMESPACE = '/v2';
const CLIENT_MESSAGE = 'client-message';
const SERVER_MESSAGE = 'server-message';

/** Upserts are acknowledged with the write result; everything else with `true`. */
export const defaultAnswer: AnswerRule = (message) =>
  message.kind === 'UpsertUser' || message.kind === 'UpsertCompany'
    ? { ok: true, rejected: [] }
    : true;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class ProtocolServer {
  /** Every handshake, accepted or refused, in order. */
  readonly attempts: Attempt[] = [];
  /** Every accepted connection, in order; a kicked or dropped one keeps its record. */
  readonly connections: Connection[] = [];
  /** Every client message with the answer it got, in order. */
  readonly seen: Seen[] = [];
  handshake: HandshakeRule = () => ({ accept: true });
  answer: AnswerRule = defaultAnswer;

  private constructor(
    private readonly http: HttpServer,
    private readonly io: Server,
    private readonly port: number,
  ) {}

  get url(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  static async start(): Promise<ProtocolServer> {
    const http = createServer();
    const io = new Server(http, { transports: ['websocket'], cors: { origin: true } });
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
    const { port } = http.address() as AddressInfo;
    const server = new ProtocolServer(http, io, port);
    server.wire();
    return server;
  }

  /**
   * The network going away for good, until `goOnline`: open transports are
   * dropped and the port stops answering, so every reconnection attempt is
   * refused (a retryable error, from the SDK's point of view).
   */
  async goOffline(): Promise<void> {
    this.dropTransport();
    await new Promise<void>((resolve) => this.http.close(() => resolve()));
  }

  async goOnline(): Promise<void> {
    await new Promise<void>((resolve) => this.http.listen(this.port, '127.0.0.1', resolve));
  }

  private wire(): void {
    const namespace = this.io.of(NAMESPACE);
    namespace.use(async (socket, next) => {
      const auth = socket.handshake.auth as Record<string, unknown>;
      const verdict = await this.handshake(auth);
      this.attempts.push({ seq: this.attempts.length + 1, auth, verdict });
      if (verdict.accept) {
        next();
        return;
      }
      // The shape the real gateway sends (web-socket-v2.gateway.ts): the SDK
      // reads `data.retryable` to decide whether to keep trying.
      next(
        Object.assign(new Error(verdict.message ?? 'SDK authentication failed'), {
          data: { code: verdict.code, retryable: verdict.retryable },
        }),
      );
    });
    namespace.on('connection', (socket) => {
      const connection: Connection = {
        seq: this.connections.length + 1,
        id: socket.id,
        auth: socket.handshake.auth as Record<string, unknown>,
        connectedAt: Date.now(),
        socket,
      };
      this.connections.push(connection);
      socket.on(CLIENT_MESSAGE, async (message: ClientMessage, ack?: (value: unknown) => void) => {
        const answer = await this.answer(message, connection);
        this.seen.push({ seq: this.seen.length + 1, connection, message, answer });
        if (answer !== 'silent') {
          ack?.(answer);
        }
      });
      socket.on('disconnect', (reason) => {
        connection.disconnectedAt = Date.now();
        connection.reason = reason;
      });
    });
  }

  /** Forget everything and restore the default rules; connections still open are closed. */
  reset(): void {
    for (const connection of this.live()) {
      connection.socket.disconnect(true);
    }
    this.attempts.length = 0;
    this.connections.length = 0;
    this.seen.length = 0;
    this.handshake = () => ({ accept: true });
    this.answer = defaultAnswer;
  }

  live(): Connection[] {
    return this.connections.filter((connection) => connection.disconnectedAt === undefined);
  }

  /** The messages of one kind (or all of them), in the order they arrived. */
  messages(kind?: string): Seen[] {
    return kind ? this.seen.filter((seen) => seen.message.kind === kind) : [...this.seen];
  }

  /** A server-initiated disconnect: the SDK sees `io server disconnect` and reconnects by itself. */
  kick(connection: Connection | undefined = this.live().at(-1)): void {
    connection?.socket.disconnect(true);
  }

  /**
   * The network going away: the underlying transport of every open connection
   * is closed, the SDK sees `transport close` and Socket.IO's own reconnection
   * takes over (after its backoff, which the page clock drives).
   */
  dropTransport(): void {
    for (const connection of this.live()) {
      connection.socket.conn.close();
    }
  }

  /** Push a server message and resolve with the SDK's acknowledgement. */
  push(kind: string, payload: unknown, connection: Connection | undefined = this.live().at(-1)) {
    if (!connection) {
      throw new Error('push: no live connection');
    }
    return connection.socket.emitWithAck(SERVER_MESSAGE, { kind, payload });
  }

  /** Wait until the recorded traffic satisfies `predicate`, polling with real time. */
  async waitFor(predicate: () => boolean, what: string, timeoutMs = 5_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
      if (Date.now() > deadline) {
        throw new Error(`protocol server: timed out waiting for ${what}`);
      }
      await sleep(25);
    }
  }

  waitForMessages(kind: string, count: number, timeoutMs?: number): Promise<void> {
    return this.waitFor(
      () => this.messages(kind).length >= count,
      `${count} × ${kind} (have ${this.messages(kind).length})`,
      timeoutMs,
    );
  }

  /**
   * Wait until every batch the SDK opened has closed. A batch closes 50ms of
   * page time after its last acknowledgement, so advance the page clock
   * first; count-based assertions taken before that see the EndBatch land.
   */
  waitForBatchesToClose(timeoutMs?: number): Promise<void> {
    return this.waitFor(
      () => this.messages('EndBatch').length >= this.messages('BeginBatch').length,
      'the open batches to close',
      timeoutMs,
    );
  }

  waitForConnections(count: number, timeoutMs?: number): Promise<void> {
    return this.waitFor(
      () => this.connections.length >= count,
      `${count} connections (have ${this.connections.length})`,
      timeoutMs,
    );
  }

  waitForDisconnect(connection: Connection, timeoutMs?: number): Promise<void> {
    return this.waitFor(
      () => connection.disconnectedAt !== undefined,
      `connection ${connection.seq} to disconnect`,
      timeoutMs,
    );
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.io.close(() => resolve()));
    if (this.http.listening) {
      await new Promise<void>((resolve) => this.http.close(() => resolve()));
    }
  }
}
