# Realtime SDK ↔ Server Mechanism

This document describes how the realtime channel between the SDK (`apps/sdk`) and the server gateway (`apps/server/src/web-socket/v2/`) works in practice. It is a living document — update it as the code evolves.

For the rationale behind the current identity-isolation scope, see [ADR 0001](../adr/0001-socket-identity-isolation.md).

## Overview

```
SDK (browser)                                Server (NestJS gateway, /v2)
─────────────                                ──────────────────────────────
identify(u, ...)                             handshake middleware
group(c, ...)                                  ↓ initializeSocketData(auth)
track(...)                                     ↓ ensureBizUser, getBizCompany
   ↓                                           ↓ socketData → Redis
emit('client-message', { kind, payload,        ↓ socket.join(roomId)
                          requestId })
   ↓ Socket.IO 4.x                           @SubscribeMessage('client-message')
   ↓ EIO=4 transport                          ↓ queueService.executeInOrder
   ↓                                          ↓ messageHandler.handle(kind)
   └────────────────────► WS ◄────────────────┘
```

The transport is Socket.IO 4.x (server `socket.io` 4.7.5/4.8.1, client `socket.io-client` 4.8.1, Engine.IO 6.x), single namespace `/v2`. Identity is established at the WebSocket handshake and stored server-side in `socketData` (Redis-backed, keyed by `socket.id`).

## Identity Model

### SocketAuthData → SocketData

The SDK's `auth` callback returns the current credentials at every (re)connect:

```ts
// apps/sdk/src/core/usertour-socket.ts
auth: (cb) => cb(this.authCredentials || {})
// authCredentials = { externalUserId, token, clientContext }
```

The server's handshake middleware (`apps/server/src/web-socket/v2/web-socket-v2.gateway.ts`) reads this, resolves the environment from the token, ensures a `bizUser` exists, optionally resolves an existing `bizCompany`, and writes the result into `socketData`:

```ts
// apps/server/src/common/types/content.ts
interface SocketData {
  environment: Environment;
  externalUserId: string;
  bizUserId: string;             // ensureBizUser at handshake guarantees this
  externalCompanyId?: string;    // optional; resolved from auth payload
  bizCompanyId?: string;         // resolved at handshake or set by UpsertCompany
  clientContext: ClientContext;
  flowSession?: ...;
  checklistSession?: ...;
  // ... other session/state fields
}
```

### Connection-bound `(token, externalUserId)`

The SDK reconnects whenever either token or `externalUserId` changes:

```ts
// usertour-socket.ts requiresReconnect
return (
  this.authCredentials.externalUserId !== externalUserId ||
  this.authCredentials.token !== token
);
```

`externalCompanyId` is **not** part of `requiresReconnect`. `group()` does not trigger a reconnect; it sends an in-band `UpsertCompany` message that updates `socketData.bizCompanyId` server-side mid-connection.

This asymmetry is intentional for v0.7.x — see [ADR 0001](../adr/0001-socket-identity-isolation.md) for why.

### Room scoping

`buildExternalUserRoomId` (`apps/server/src/utils/websocket-utils.ts:71`) produces:

```
user:${environmentId}:${externalUserId}
```

Company is **not** included. Two sockets on the same `(env, user)` but different active companies share the same Socket.IO room.

#### Call sites

| Location | Role |
|---|---|
| `web-socket-v2.gateway.ts:66` | Handshake capacity check (cap of 100 sockets per `(env, user)` room before accepting connection) |
| `web-socket-v2.service.ts:958` | `cancelAllContentSessions` — when content is unpublished, find every socket of every affected user to cancel sessions |
| `content-orchestrator.service.ts:173` | `handleContentEnd` — fan-out content end to other sockets of the same user |
| `content-orchestrator.service.ts:1174` | `handleSessionActivation` — when a flow / checklist activates on one socket, propagate to other sockets of the same user (multi-tab UI sync) |
| `content-orchestrator.service.ts:1218` | `handleSessionCancellation` — same idea, for cancellation |

The multi-tab UI-sync intent (call sites 3–5) is the core reason the room key is `(env, user)` rather than `(env, user, company)`: when the same user has multiple tabs open in the same workspace, content state should sync across them.

## Connection Lifecycle

### Handshake

```ts
// gateway.ts afterInit
server.use(async (socket, next) => {
  const auth = socket.handshake.auth;
  socket.data.token = auth.token;
  const socketData = await this.service.initializeSocketData(auth);
  if (!socketData) return next(new SDKAuthenticationError());
  await this.socketDataService.set(socket, socketData);

  const room = buildExternalUserRoomId(
    socketData.environment.id,
    socketData.externalUserId,
  );
  const socketsInRoom = await this.server.in(room).fetchSockets();
  if (socketsInRoom.length >= 100) return next(new ServiceUnavailableError(...));
  await socket.join(room);
  next();
});
```

`initializeSocketData` does the database resolution (`ensureBizUser`, `getBizCompany`, and session re-hydration via `initializeSessions` when the auth payload carries session IDs — see [Session resumption](#session-resumption) below). Roughly 2–3 round trips of WS protocol overhead before `connect` fires on the client.

### Reconnection

`socket.io-client` defaults are kept (only `reconnection: true` is set explicitly):

| Parameter | Value | Notes |
|---|---|---|
| `reconnection` | `true` | auto-reconnect enabled |
| `reconnectionAttempts` | `Infinity` | retries forever |
| `reconnectionDelay` | `1000ms` | initial delay |
| `reconnectionDelayMax` | `5000ms` | exponential backoff cap |
| `randomizationFactor` | `0.5` | ±50% jitter |
| `timeout` | `5000ms` | per-handshake timeout |

On reconnect, the `auth` callback runs again with the **current** `authCredentials` (so credential changes mid-flight take effect), and the server runs `initializeSocketData` against the new `socket.id`. The fresh `socketData` is re-hydrated with active sessions when the auth payload carries their IDs — see [Session resumption](#session-resumption) below.

`sendBuffer` (messages emitted while disconnected) is preserved across reconnect by `socket.io-client` and flushed once `connect` fires.

#### Session resumption

The SDK keeps the active session IDs on `authCredentials`, so reconnect handshakes carry them and the server rebuilds `socketData` with the live sessions intact:

```ts
// usertour-core.ts syncSocketCredentials (line 1586)
this.socketService.updateCredentials({
  externalUserId,
  externalCompanyId,
  token,
  flowSessionId: this.activatedTour?.getSessionId(),
  checklistSessionId: this.activatedChecklist?.getSessionId(),
  bannerSessionId: this.activatedBanner?.getSessionId(),
  resourceCenterSessionId: this.activatedResourceCenter?.getSessionId(),
  launchers: this.launchers.map(l => l.getContentId()),
  clientConditions,
  clientContext,
});
```

`syncSocketCredentials()` is called from `handleServerMessageSucceeded()` — every successful server message pushes a fresh snapshot of the active session IDs into `authCredentials`. The `auth` callback returns `authCredentials` on every (re)connect, so the server's `initializeSocketData → initializeSessions` Promise.all (`web-socket-v2.service.ts` lines 158–176) re-fetches each `BizSession` by id and assigns them back to `socketData.flowSession` / `checklistSession` / etc.

End result: a transient disconnect (e.g. tab background → ping timeout → reconnect) restores the same `socketData` shape on the new socket, so any in-progress flow / checklist / banner / resource-center continues without restart.

**Caveat:** the snapshot is only as fresh as the most recent `handleServerMessageSucceeded`. If a session is activated by client-side code with no immediate server round-trip, the credentials sync waits until the next server message before that activation lands in `authCredentials`. In practice the activation paths route through server messages (`SetFlowSession`, etc.), so this window is small.

`connect_error` (e.g. server-side handshake auth rejection) is **not** handled specially — the default reconnection loop continues retrying. The SDK's CONNECT_TIMEOUT (30s) is an application-layer safety net only; the underlying socket keeps trying on its own schedule.

### Disconnect

```ts
// gateway.ts handleDisconnect
async handleDisconnect(socket) {
  this.queueService.clearQueue(socket.id);
  await this.socketDataService.delete(socket);
}
```

Both transient drops and explicit disconnects clean up `socketData` from Redis. There is a 24-hour TTL on `socketData` keys as a backstop for missed `handleDisconnect` invocations.

## Message Flow

### Routing

```ts
// gateway.ts
@SubscribeMessage('client-message')
@UseGuards(WebSocketThrottlerGuard)
async handleClientMessage(@ConnectedSocket() socket, @MessageBody(...pipe) msg) {
  return await this.queueService.executeInOrder(socket.id, async () => {
    return await this.messageHandler.handle(this.server, socket, msg.kind, msg.payload);
  });
}
```

Messages within a single socket are processed in arrival order (`queueService.executeInOrder`) so that `BeginBatch` always lands before the messages it scopes, and `EndBatch` lands after.

### Batch coalescing

The SDK opens a batch the first time a `{ batch: true }` message is sent within the batch window:

```ts
// usertour-socket.ts sendClientMessage
if (options?.batch) {
  if (!this.inBatch) {
    this.inBatch = true;
    void this.beginBatchInternal();   // fire-and-forget
  }
  // schedule EndBatch on a 50ms timer (BATCH_TIMEOUT)
}
```

`BeginBatch` is **fire-and-forget** — TCP/Socket.IO ordering guarantees the server processes `BeginBatch` before the next batched message on the same socket, so awaiting its ack would only add a full RTT per batch without changing semantics.

### `toggleContents` on `EndBatch`

```ts
// web-socket-v2.service.ts endBatch
async endBatch(context) {
  return await this.contentOrchestratorService.toggleContents(context);
}
```

`toggleContents` (`content-orchestrator.service.ts:356`) walks every content type, re-runs each active session through its hide-rule evaluation, and cancels sessions whose hide rules now match (i.e. the session should no longer be visible to the user under current `socketData` state).

This is the core self-healing mechanism for context shifts:

- After `group(newCompany)`, `socketData.bizCompanyId` is updated by `UpsertCompany`, then `EndBatch` triggers `toggleContents`. Flows audience-targeted to the previous company will have their hide rules fire and be cancelled. Flows that don't have company-specific targeting continue.
- This is why a "blanket reconnect on company change" is **not** a strict improvement — it would terminate sessions that should legitimately continue across the switch.

## Failure Modes

### 1. Network unreachable / endpoint wrong

```
identify() → setAuth (sync) → emit upsertUser → into sendBuffer
                            → background connect never succeeds
                            → emitWithAck times out at EMIT_TIMEOUT (30s)
                            → identify throws
```

Caller observes failure after 30s. The pre-refactor `await connect()` model behaved identically (both have CONNECT_TIMEOUT / EMIT_TIMEOUT at 30s).

### 2. Token rejected at handshake

Server middleware returns `next(new SDKAuthenticationError())` → client receives `connect_error` → default reconnection loop retries forever → CONNECT_TIMEOUT fires after 30s, `connectingPromise` resolves false, but pending emits hit their own EMIT_TIMEOUT after 30s.

Net effect: 30s before the caller's `await` rejects. The SDK does not currently listen for `connect_error` to short-circuit; this is a known limitation, not a v0.7.1.3 regression.

### 3. Identify state left set after upsert failure

```ts
this.externalUserId = externalUserId;            // optimistic write
this.socketService.setAuth(externalUserId, token);
const result = await this.socketService.upsertUser(...);
if (!result) throw new Error(FAILED_TO_IDENTIFY_USER);
```

`externalUserId` is set **before** the await. On failure, the throw leaves it set. This matches industry-standard analytics SDK behavior — failure means "couldn't sync right now", not "user was never identified". Subsequent retry with the same `externalUserId` skips `requiresReconnect` and reuses the existing connection.

Attribute writes (`attributeManager.setUserAttributes`) stay **after** the await, because `updateUser`'s change-detection compares attributes — writing optimistically would cause retry-with-same-attrs to be skipped.

### 4. Server returns `ack=false`

`emitWithAck` resolves with `false` (not a throw) at ~1 RTT. The `identify` / `group` / `track` wrapper checks the result and throws on falsy. Fast failure path, no surprises.

### 5. Mid-flight credential switch (`identify('u1') ... identify('u2')`)

```
identify(u1) → setAuth(u1) → upsertUser(u1) emit → sendBuffer
identify(u2) → setAuth(u2) → requiresReconnect → socket.disconnect
                           → reconnect with u2 auth
                           → sendBuffer flushes upsertUser(u1) on the new socket
                           → server upsert guard: payload externalUserId=u1
                             ≠ socketData.externalUserId=u2 → ack(false)
                           → identify(u1)'s emit resolves false → throws
```

The server-side upsert guard (added in v0.7.1.3) catches this on the upsert path. Non-upsert handlers (track, start/end, conditions, etc.) do not validate payload identity — see [ADR 0001](../adr/0001-socket-identity-isolation.md) for why this is accepted.

### 6. Reconnect during healthy session

Network drops mid-emit → `socket.io-client` auto-reconnects with current auth → server rebuilds `socketData`, re-hydrating any active sessions from the IDs in the auth payload (see [Session resumption](#session-resumption) above) → `sendBuffer` flushes onto new socket → ack returns. Caller observes elevated latency but no failure (assuming reconnect completes within `EMIT_TIMEOUT`), and any in-progress flow continues seamlessly.
