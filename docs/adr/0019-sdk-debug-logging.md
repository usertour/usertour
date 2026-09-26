# 0019: SDK debug logging — a public switch, a visible floor, and levels that mean something

- **Date:** 2026-09-26
- **Status:** Accepted

## Context

The SDK runs inside customers' production pages, so its console is silent by default: every log call in `apps/sdk/src/utils/logger.ts` sits behind a gate read from `localStorage.debug` (the npm `debug` convention — `*` or a `usertour-widget…` namespace opens it). That stance is deliberate and is kept. The gate was rebuilt on 2026-07-26 after two incidents (a storage read at module scope that could throw and kill the whole SDK; a runtime switch that only took effect after a reload), and it exposes `enabled()` / `disable()` to flip it at runtime.

A survey of the logging surface (2026-09-26) found the skeleton sound and three gaps:

1. **Nothing is visible when the SDK is broken.** `logger.critical` — the one level that bypasses the gate, "reserved for failures that must never be swallowed" — has zero call sites. The two failures a host has no other way to learn about run through the gated `logger.error`: the UI failing to initialise after all retries (content will never render), and a handshake the server rejected as not retryable (ADR 0018: the SDK stops reconnecting). A customer reporting "nothing shows" opens a console that is empty.
2. **The switch has no public surface and no documentation.** `enabled()` / `disable()` are not on the `Usertour` API; the only way to see logs is to hand-edit `localStorage.debug` and reload, and no docs page says so.
3. **Levels do not mean anything.** There are three — `info`, `warn`, `error` — and 87 call sites: 24 `info` that are really traces (every condition evaluation, every timer start/fire/cancel, queue processing), 44 `error` that mix genuine failures with catch-all "Error in X checking" bookkeeping and ordinary situations (a tooltip target not found is already reported to the server), and no `debug` level. Once the gate opens, the signal drowns.

Two things are fine and stay: the widget package prints nothing; the loader's two unconditional `console.warn`s (script failed to load, unsupported method called) and the two `console.error`s around a host-supplied `urlFilter` callback are correct — those are the host's own failures.

A survey of 17 browser SDKs (analytics, CDP, onboarding, and infrastructure vendors; official docs and source only) gave the reference points:

- Silent-by-default is the norm for analytics and infrastructure SDKs; the exceptions print at `warn` or `info`.
- **Misconfiguration is never hidden behind the debug switch**: it is either thrown to the host or printed unconditionally with a fixed prefix (a `critical` tier, or schema-validation errors).
- A runtime switch — one method call — is standard; one vendor also persists it and honours a URL query parameter. The `localStorage` convention is specific to the `debug` package lineage (which Socket.IO, our transport, follows).
- Level vocabularies converge on `debug` / `info` / `warn` / `error` with an off value; two vendors route `debug` to `console.log` because Chrome hides `console.debug` by default.
- Every SDK that prints uses a stable prefix; few add timestamps.
- Custom logger injection is rare; in-page debugger panels and browser extensions are the onboarding vendors' main path; error telemetry to the vendor's backend is one observability vendor's approach.

## Decision

### 1. Silent by default, as before

Nothing changes for a page that never touches the switch, except §2.

### 2. Two failures bypass the gate — and nothing else

`logger.critical` is used at exactly two sites:

1. UI initialisation failed after its last retry (`UsertourUIManager`): content will never render on this page.
2. The connection was rejected as not retryable (ADR 0018 `rejected`): the SDK has stopped, the credentials — environment token or identity token — are refused.

The bar is: *the host has no other way to learn about it*. Both happen asynchronously with no promise the host could observe. Anything the host can observe stays where it is: a call before `init()` or `identify()` **throws** (`MUST_IDENTIFY_FIRST` and friends), a failed `identify()` **rejects**, and none of those is ever downgraded to a gated log. This list is closed; extending it means amending this ADR.

### 3. A public switch and a URL parameter

- **`usertour.setDebug(enabled: boolean)`** — the one API addition. It calls the existing `enabled()` / `disable()`: effective immediately, persisted in `localStorage.debug` under the SDK's own namespace so it survives reloads until `setDebug(false)`. The loader queues it like the other `set*` methods, so a call placed before the script has loaded is applied on load instead of throwing.
- **`?usertour_debug=1`** in the page URL turns the gate on for that page load without persisting. This is the support path: a customer adds a parameter and takes a screenshot; no code, no storage editing, no explanation of namespaces.
- The `localStorage.debug` convention stays as the third door; `localStorage.debug = '*'` also opens Socket.IO's own logs, which is useful when the transport is the question.

No `logLevel` option: the switch is boolean and shows everything, as the analytics SDKs do. Finer filtering by namespace is possible later through the existing convention (`readFlag` already accepts `usertour-widget:<scope>`) and is not built now.

### 4. Four levels with defined meaning, plus a scope tag

| Level | Meaning | Console method |
|---|---|---|
| `debug` | Internal state flow: condition evaluations, timer start/fire/cancel, socket signals and state transitions, queue processing, cache decisions. Dozens of lines per minute is fine here. | `console.log` (Chrome hides `console.debug` by default) |
| `info` | Milestones, a dozen per session: identified, content started/ended, batch evaluated, reconnected, credentials changed. | `console.log` |
| `warn` | Degraded but continuing: an unsupported method, evaluation disabled, an attribute dropped, a handler missing, a target element not found. | `console.warn` |
| `error` | One operation failed: an emit or request failed, a handler or host callback threw, a fetch failed. Still gated. | `console.error` |
| `critical` | §2 only. | `console.error`, always |

Every line carries a scope: `logger.scope('socket')` yields the prefix `[usertour-widget:socket]`. The existing `+Xms` delta and colour stay as they are.

The 87 existing call sites are reclassified against this table in the same change. The bulk moves `info` → `debug`; the `error` catch-alls that wrap a whole polling tick stay `error` but name what was being done; ordinary situations already reported to the server (target not found, store missing for a step that was just cancelled) move to `warn`; UI initialisation logs `warn` on a retried attempt and `critical` on the last.

### 5. One docs page

`Debugging` in the usertour.js reference: the three ways to open the gate, what a line looks like, and what to look for by symptom — "nothing shows" → the `socket` scope's handshake and evaluation lines and the two `critical` messages; "a step does not attach" → `warn` lines from the content scope — plus the network view: the `wss` connection to the environment and its `client-message` frames.

## Consequences

- A customer's console gains two possible unconditional lines, both meaning "this page's Usertour is not going to work and here is why". Everything else stays invisible until asked for.
- Support gets a one-line instruction (`usertour.setDebug(true)`, or a URL parameter) and a docs page to point at.
- Opening the gate becomes useful: traces are separable from milestones and failures by level and scope.
- One public method to keep stable, and a reserved query parameter name.
- The reclassification touches most SDK files at the log lines only; no behaviour changes.

## Alternatives Considered

- **A `logLevel` option** (one analytics vendor, two infrastructure vendors). More surface for no present need; the boolean switch plus scopes covers filtering.
- **Custom logger injection** (`loggerProvider` / `onLog` style). Three of seventeen SDKs offer it; nobody has asked.
- **An in-page debugger panel or browser extension.** The onboarding vendors' main path, but a product of its own; console logging is the floor it would be built on.
- **Reporting SDK errors to our backend.** One observability vendor does this with sampling; for an onboarding SDK the privacy cost of shipping page-side diagnostics outweighs the benefit, and it does not help the customer at the console.
- **Build-time stripping of debug code.** Two bundle-size vendors do it with a build flag and ship two bundles; ours is one CDN build and the gated code is a few kilobytes.
- **Making the rejection visible through a public event.** ADR 0018 §7 deferred the public event system; `critical` reaches the host without one.
- **Keeping `localStorage.debug` as the only switch.** It is the transport's convention, not a product one; every peer that logs exposes a call.

## Triggers to Revisit

- Support cannot read the gated output even with scopes → add namespace filtering to the switch (`setDebug('socket')`), which `readFlag` already anticipates.
- A host needs to route SDK logs into its own tooling → a logger callback, `onLog`-style, additive to the console.
- Demand for a visual state inspector (what content is eligible and why) → that is the debugger-panel product, designed separately.
- A third failure genuinely meets the §2 bar → amend the list here, with the failure and why the host cannot otherwise observe it.
