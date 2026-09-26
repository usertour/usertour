# 0018: SDK connection recovery — reconnect rules, replay, and re-evaluation

- **Date:** 2026-09-25
- **Status:** Accepted

## Context

The SDK ↔ server channel is Socket.IO on the `/v2` namespace (ADR 0001). Identity is presented at the handshake through an `auth` callback that always returns the SDK's latest credentials — environment token, identity token, client context, client conditions, the four singleton session ids and the launcher list — refreshed after every successfully handled server message (`syncSocketCredentials`). The server's handshake middleware (`WebSocketV2Gateway.afterInit`) validates the environment, verifies identity (ADR 0009), ensures the user, **re-initialises the sessions named in `auth`**, stores the result as `socketData` in Redis (24 h TTL, keyed by socket id) and joins the per-user room. On disconnect it deletes `socketData`; sessions themselves live in the database, so a reconnect picks them up again.

Outages are handled by Socket.IO's own machinery: the manager reconnects with 1 s → 5 s backoff, without an attempt limit; messages emitted while disconnected sit in the send buffer and flush in order on reconnect; every emit carries a 30 s acknowledgement timeout (`EMIT_TIMEOUT`), and a timed-out packet is removed from the buffer, so a late reconnect never replays it. In-flight packets whose socket closes are rejected immediately. The SDK registers **no** `connect`, `disconnect` or `connect_error` listener; the only connection logic it owns is the initial connect attempt (`ensureConnecting`) and a revival when the identity token changes while disconnected (`updateCredentials`).

A source-level review of that path (2026-09-25; socket.io-client 4.8.1, socket.io 4.7.5) found the skeleton sound — credentials are always current, sessions reattach, timed-out writes do not ghost — and the failures concentrated at the edges:

1. **Two paths leave the socket dead for the life of the page.** Socket.IO does not reconnect a socket after a handshake rejection (`CONNECT_ERROR` → `socket.destroy()`) nor after a server-initiated disconnect (`onclose("io server disconnect")` after `destroy()`). Both happen here:
   - The handshake middleware maps **every** failure to an authentication error — an invalid environment token, a rejected identity token, but also a Redis write failure, a database error while ensuring the user, or a full room. A deploy restart makes every client reconnect at once; the handshakes that hit a saturated pool are rejected as "authentication failed" and those tabs stay offline until a reload. The only revival is a *changed* identity token arriving through `identify()` / `updateUser()`; projects without identity tokens have no path at all.
   - `WebSocketV2Guard` calls `socket.disconnect(true)` when `socketData` is missing from Redis. A Redis restart or failover, or the 24 h TTL on a tab that stayed connected but wrote nothing for a day, trips it; the client never reconnects.
2. **An outage longer than 30 s loses the attributes of `identify()`.** The packet times out and is dropped, `identify()` rejects, and the reconnect handshake creates the user bare (`ensureBizUser`). Nothing resends the attributes; hosts do not retry `identify()`. (`updateUser()` is unaffected: its local cache was not updated, so the same values are sent again.)
3. **A reconnect does not re-evaluate content.** The handshake rebuilds `socketData` but `toggleContents` runs only from client messages. An idle page — no URL change, no client-condition change — never learns what changed server-side during the outage (a new publish, a segment change, a session ended from another tab). Unpublish has a room broadcast; "newly eligible content" has nothing.
4. **Wait timers restart from zero after a reconnect.** `initializeSocketData` sets `waitTimers: []`; the SDK's timer is still running. When it fires, `fireConditionWaitTimer` finds no timer and returns `false`. The next evaluation re-issues the timer and `addWaitTimer` cancels the running one and starts over — and with (3) that next evaluation may be a long way off.
5. **The host cannot observe any of this.** No connection event is exposed; a rejected handshake, an expired identity token, a stranded socket all look like a page where nothing shows. (Recorded as a finding; §7 defers it.)

Two things are *not* problems and are recorded so they are not re-reviewed: the server has no batch state (`BEGIN_BATCH` is a no-op, `END_BATCH` runs `toggleContents`), so a client-side `inBatch` flag left over from before the outage only skips one ignored message; and events are already reported to the caller on failure, so their loss is visible.

## Decision

### 1. The SDK owns a connection state machine

`UsertourSocket` registers `connect`, `disconnect` and `connect_error` and keeps an explicit state: `connecting → connected → reconnecting → rejected`. The transitions and their actions:

| Signal | Action |
|---|---|
| `disconnect`, reason `io client disconnect` | Our own disconnect (credential change, `disconnect()`): no action. |
| `disconnect`, any transport reason | Socket.IO reconnects by itself: record `reconnecting`. |
| `disconnect`, reason `io server disconnect` | Socket.IO will not reconnect: the SDK reconnects **manually** with backoff. |
| `connect_error` with `err.data.retryable === true` | Manual reconnect with backoff. |
| `connect_error` with `err.data.retryable === false` | Stop: state `rejected`, host event (§7). Only credentials that *differ* from the rejected ones (`setAuth` / `updateCredentials`) start a new attempt — the existing rule, kept. |
| `connect_error` without `data` (older server) | Treated as retryable: a handshake a minute is better than a page offline forever. |
| `connect` after a previous connection | `resetBatchState()`, replay unacknowledged writes (§4), then `END_BATCH` (§5). The first connection does neither: `identify()` drives it. |

Manual backoff: 1 s doubling to a 60 s cap, ±25 % jitter, no attempt limit. Once a manual `connect()` succeeds, Socket.IO's own manager handles later transport drops again; the manual loop only exists for the two cases the manager abandons.

The connection-bound identity of ADR 0001 — `(token, externalUserId)` — is unchanged. Everything this ADR replays or restores belongs to the current identity and is cleared on a user switch or `reset()`.

### 2. The server tells the client whether to retry

The handshake middleware distinguishes two outcomes and attaches `data` to the error it passes to `next()` (Socket.IO forwards `err.data` to the client's `connect_error`):

- **Authentication failed** — unknown or deleted environment token, identity verdict rejected: `SDKAuthenticationError`, `data: { code: 'E1018', retryable: false }`.
- **Everything else** — a thrown database or Redis error, a failed `socketDataService.set`, a full room: `ServiceUnavailableError`, `data: { code: 'E1014', retryable: true }`.

The catch-all no longer reports a transient server fault as the client's fault.

### 3. The guard rebuilds instead of kicking

When `WebSocketV2Guard` finds no `socketData`, it rebuilds it from `socket.handshake.auth` through the same `initializeSocketData` the handshake uses, stores it, and lets the message through. Only a rebuild that fails disconnects the socket — and the SDK now reconnects from that too (§1). The 24 h TTL stays; a rebuild is a renewal.

### 4. Unacknowledged upserts are replayed on reconnect

The socket service keeps at most one pending payload per kind for `UpsertUser` and `UpsertCompany` (the latest wins). A payload is registered when `identify()` / `updateUser()` / `group()` / `updateGroup()` emits it; it is retired when the acknowledgement arrives — success **or** an explicit `false` from the server — and marked failed when the emit fails because of a timeout or a closed socket. On connect the socket service replays the failed ones, user then company, batched; the core folds an accepted replay into the attribute cache exactly as the original call would have.

Only these two kinds replay: they are literal merges and idempotent. Events are not replayed (a replay can double-count, and the caller already received the failure); content messages are not replayed (each has its own UI feedback). A key carrying an `add` operation is stripped from a replayed payload: after a timeout the SDK cannot know whether the server applied the write before the acknowledgement was lost, and ADR 0017 accepted `add` as non-idempotent without widening that window. `set_once`, `union` and `remove` are idempotent and replay as-is.

`identify()` keeps its 30 s contract: it still rejects after the timeout. What changes is that the SDK heals afterwards instead of leaving the user bare.

### 5. A reconnect triggers one evaluation

After the replay, the SDK sends a single `END_BATCH`. The server's existing `endBatch → toggleContents` is the entry point; no new message kind. The first connection is excluded — `identify()` already batches — so the cost is one evaluation per reconnect, and there is no evaluation before the user's attributes have landed.

### 6. Wait timers travel in the handshake

`SocketAuthData` gains `waitTimers: ConditionWaitTimer[]`, declared by the client like `clientConditions` are today. The SDK's timer monitor keeps a fired timer on record (`activated: true`) until it is cancelled, and `syncSocketCredentials` includes every running and fired timer. `initializeSocketData` restores `auth.waitTimers` instead of resetting to `[]`, treated exactly like `clientConditions`: stored as declared, with only a non-array refused (it would throw in the auto-start filter). The server reads two fields of a stored timer — `versionId` and `activated` — so there is nothing else to validate.

The next evaluation then finds the timers already present: a running one is not re-issued (the SDK's clock keeps its remaining time), a fired one satisfies `isAllowedByConditionWaitTimers` and the content starts. The trust surface equals that of `clientConditions`: a client can only make its own content appear earlier.

### 7. Host observability is deferred

No host-facing event ships with this. The SDK's public `on()` / `off()` are unimplemented stubs, so a connection event would have meant opening the public event system — a separate, long-lived API commitment that a resilience fix should not create as a side effect, and one with no demand behind it. A rejected handshake is logged (`logger.warn`), and the documented path for an expiring identity token stays proactive: refresh it before it expires and hand it to `updateUser()` / `updateGroup()`, which revives a rejected connection. If a host needs to react to the connection state, that is the trigger to design the event system on its own.

### 8. Testing

The SDK has no test harness. The state machine (signal → next state + actions), the backoff sequence and the replay registry are written as pure functions in `@usertour/helpers`, where jest runs them table-driven; `UsertourSocket` and the core only wire them to Socket.IO. Server e2e covers: a handshake that throws yields `retryable: true`; an invalid token yields `retryable: false`; a message arriving after its `socketData` was deleted from Redis is served after a rebuild, not disconnected; `waitTimers` in `auth` survive into `socketData`, and a non-list is stored as `[]`.

### 9. Rollout

Server first — the error classification, the guard rebuild and the optional `waitTimers` in `auth` are all backward compatible with the current SDK. SDK second; it treats a `connect_error` without `data` (an older self-hosted server) as retryable, so nothing strands on a version skew.

## Consequences

- A rejected handshake or a server-initiated disconnect is no longer terminal: transient faults heal with backoff, and authentication faults are reported to the host instead of swallowed.
- A reconnect now costs one `toggleContents` plus, when a write timed out, one or two upserts — all inside the batched path the SDK already uses.
- Attributes from an `identify()` that timed out reach the server on the next connection; `add` operations in such a payload are dropped rather than risked twice, and that is documented with the operation.
- Wait timers keep their remaining time across a reconnect; a fired timer is honoured on the first evaluation after it.
- `socketData` gains a client-declared `waitTimers` list with the same trust posture as `clientConditions`.
- No new public API: hosts learn of a rejection from the console until an event system is designed on its own.
- Three new pure modules in `@usertour/helpers` and the first tests that exercise SDK behaviour.

## Alternatives Considered

- **Socket.IO `connectionStateRecovery`.** Restores rooms and missed packets after a short outage. It needs the Redis adapter's recovery support and buys the skip of one handshake; it does nothing for a rejected handshake, a server kick, a lost `identify()` or a stale evaluation. Not adopted.
- **Evaluating on the server's `connection` event.** Would also run on the first connection, before `identify()`'s attributes exist — a wasted evaluation and a wrong one. The client-side `END_BATCH` on reconnect only is cheaper and correct.
- **SDK-side timer recovery** — on a re-issued `StartConditionWaitTimer`, keep the running timer or answer `Fire` at once if it already fired. Works without a handshake change, but only after the next evaluation reaches the server, and it leaves `socketData` lying about the client's state; restoring through `auth`, like every other client-declared state, is the consistent shape.
- **Replaying every unacknowledged message.** Events would double-count and content messages would fight the UI state the user has since moved past. Only the idempotent identity writes are worth it.
- **Replaying `add` operations too.** Rejected: it widens the non-idempotency window ADR 0017 accepted; hosts that need exact counts already track events.
- **A longer `identify()` timeout.** Moves the cliff; does not remove it, and makes the host wait longer for an answer.
- **Recreating the Socket.IO instance on failure** (ADR 0001, Alt-A). Same objection as there: bespoke bookkeeping that mirrors library internals. The manual `connect()` after `destroy()` is the library's own documented recovery.
- **Adding a polling transport.** Unrelated to recovery; the websocket-only choice stands.

## Triggers to Revisit

- Production evidence of stranded sockets *after* this ships → the backoff cap or the retryable classification needs adjusting.
- A host needs missed server messages (not just a fresh evaluation) after an outage → reconsider `connectionStateRecovery` on top of this.
- A host asks to react to the connection state (a rejected token, an outage banner) → design the public event system, with `connection-state-changed` as its first event.
- The `waitTimers` list in `auth` grows past the bound in practice → move timer state server-side instead of widening the bound.
- Exact-count demand for `add` across reconnects → an idempotency key on `UpsertUser` (`requestId` already travels with every message and is unused by the server), which would let `add` replay safely.
