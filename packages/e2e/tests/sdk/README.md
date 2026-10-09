# SDK runtime suite

Real-browser tests of the SDK's runtime — the connection, the write path, the
rules it evaluates in the page, and the content it renders from server
messages — as opposed to the `widget` suite, which renders components from
fixtures and never starts the SDK.

## How a test runs

- **The bundle under test is the built one.** `scripts/static-host.mjs` serves
  `apps/sdk/dist/<version>/es2020/` under `/sdk-dist` and the host pages under
  `hosts/`. Run `pnpm build:sdk` first (the root `pnpm e2e:sdk` does).
- **The server is a protocol server the test controls** (`protocol-server.ts`):
  a real Socket.IO server that implements only the wire protocol. The test sets
  the handshake verdict, the answer to each client message (an acknowledgement,
  `false`, or silence), kicks a connection, drops its transport or takes the
  port offline, and reads back every handshake and message the server saw.
  One server per Playwright worker.
- **Time is the page's fake clock.** `fixtures.ts` installs Playwright's clock
  before the bundle loads, so the SDK's 30-second acknowledgement timeout, the
  connection timeout and every reconnect backoff are advanced with
  `sdk.advance(ms)` instead of waited for. Network round trips are still real:
  never advance the clock while an answer is on its way unless the scenario is
  that the answer never comes.
- **Calls that may hang are started, not awaited.** `sdk.begin(method, …)`
  starts a public-API call; `sdk.settle(id)` reads its outcome after the clock
  was advanced or the server answered. `sdk.call` awaits directly and is for
  calls the server answers on its own.
- **The clock keeps flowing.** `clock.install()` fakes the timers but time
  still passes in real time; `advance` jumps ahead. A batch closes on a
  50ms timer, so before counting messages, advance and call
  `protocol.waitForBatchesToClose()` — otherwise the EndBatch lands between
  the count and the assertion on some machines and not on others.
- **Assert on what the server saw.** `protocol.connections`, `attempts` and
  `messages(kind)` are the record; the page's console lines are available
  through `sdk.logLines(/pattern/)` for the warnings and criticals the host
  would see.

## What is here

- `connection.spec.ts`, `identity.spec.ts` — the connection's lifecycle and the
  write path (identify, group, the cache, the replay after a reconnect).
- `rules.spec.ts` — the conditions the SDK evaluates in the page, wait timers,
  the URL monitor, trackers.
- `flow.spec.ts`, `content-types.spec.ts` — the content lifecycle: a pushed
  session rendered, navigated, ended; checklists, banners, launchers, resource
  centers; what each reports back.
- `iframe-targeting.spec.ts` — targets inside frames: found in same-origin
  frames (nested too), positioned and judged visible with the frame's offset,
  followed across the frame's navigations; opaque when cross-origin.
- `messages.spec.ts` — the message framing (batches), `track()`, unknown server
  messages, the UI failing to initialise.
- `content.ts` — the sessions the server pushes, reduced to what the widgets
  read; `protocol-server.ts` and `fixtures.ts` — the harness.

## Running

```sh
pnpm e2e:sdk                       # from the repo root: builds the SDK, runs the suite
pnpm --filter @usertour/e2e e2e:sdk   # against the bundle already in apps/sdk/dist
```

`E2E_PROJECT=sdk` (set by the script) skips the gallery build the widget
suite needs.

## Adding a scenario

Every scenario here was a review finding once. Write the new one so that it
is red on the code that had the bug: describe the host's calls and the
server's behaviour, then assert on the handshakes and messages that must, or
must not, arrive.
