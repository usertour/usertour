# Server tests

Three surfaces verify the GraphQL authorization layer. They share **one source
of truth** — the 93-endpoint table at [`e2e/endpoints.ts`](./e2e/endpoints.ts) —
so they never drift.

| Layer | File | What it does | When to use |
|---|---|---|---|
| **e2e** (jest) | [`e2e/permission.e2e-spec.ts`](./e2e/permission.e2e-spec.ts) | 312 automated assertions: every endpoint × every role + cross-project IDOR | CI, every push, regression detection |
| **Smoke** (Node + fetch) | [`smoke/permissions.ts`](./smoke/permissions.ts) | Same 311 checks via real HTTP against an arbitrary URL | Verify staging/prod/dev with existing data + real tokens |
| **Spot-check** (Bash + curl) | [`smoke/spot-check.sh`](./smoke/spot-check.sh) (generated) | Human-readable labeled output, copy-paste curls, IDOR exploration | Manual diagnostic; eye-balling; demoing |
| Prep helper | [`smoke/prep-fixture.ts`](./smoke/prep-fixture.ts) | Seeds isolated `smoke-fixture-*` projects + mints 4 tokens | Before spot-check (1-command setup) |
| Teardown | [`smoke/teardown-fixture.ts`](./smoke/teardown-fixture.ts) | Removes the fixture (state-file based, survives renames) | After spot-check |
| Generator | [`smoke/gen-spot-check.ts`](./smoke/gen-spot-check.ts) | Regenerates `spot-check.sh` from `endpoints.ts` | After adding/renaming an endpoint in the table |

## Quick start

### Regression run (test DB, no setup)

```bash
pnpm test:e2e --testPathPattern permission
# Tests: 312 passed
```

Test DB at `localhost:5433/usertour_test`; `globalSetup` runs `prisma migrate
deploy` automatically. See [`jest-e2e.json`](./jest-e2e.json) + [`load-test-env.ts`](./load-test-env.ts).

### Spot-check on dev (manual diagnostic)

```bash
eval "$(pnpm --silent smoke:spot-check-prep)"   # seed fixture + mint tokens (2h)
pnpm smoke:spot-check --queries-only            # safe: 222 read calls
# or:
pnpm smoke:spot-check                           # full: 558 calls (prompts before mutations)
pnpm smoke:spot-check-teardown                  # always run when done
```

Flags:
- `--queries-only` — read endpoints only, zero side effects
- `--show-curl` — print each curl command alongside its result
- `--no-prompt` — run mutations without confirmation (destructive)

### Smoke against an environment you can't seed

For staging/prod where data already exists and you have real tokens:

```bash
export SMOKE_URL=https://api.example.com/graphql
export SMOKE_TOKEN_OWNER=eyJ... SMOKE_TOKEN_ADMIN=... SMOKE_TOKEN_VIEWER=... SMOKE_TOKEN_ELSEWHERE=...
export SMOKE_PROJECT_ID=... SMOKE_ENVIRONMENT_ID=... # ... all 12 ids
pnpm smoke:permissions
# Total: 218  OK: 218  Mismatch: 0
```

Token env vars are optional individually — set only ELSEWHERE for an IDOR-only
sweep, set the 4 standard ones for an in-project sweep, set all 5 for both.

## When to use which

| Goal | Tool |
|---|---|
| Catch a regression in CI | e2e |
| Verify a deploy didn't break authz | smoke (Node) |
| Manually inspect what dev returns + see curls | spot-check (bash) |
| Verify cross-project IDOR | any (all three test it; spot-check shows it most legibly) |
| Prove "real user can't reach other user's data" | spot-check with ELSEWHERE only |

## Result codes

What each row's `→ <code>` means:

| Code | Meaning |
|---|---|
| `OK` | Permission allowed, resolver succeeded |
| `E0013` | Permission denied (`NoPermissionError`). Good for "should deny" cases. |
| `E0xxx` (e.g. `E0003`, `E0015`…) | Permission allowed, resolver hit a typed `BaseError` (often "data not found"). Post-guard, **not a permission issue**. |
| `Internal Server Error` | Permission allowed, resolver threw an untyped exception → wrapped as generic 500. **Product bug worth fixing** — see commit `745a7ea3` / `2b07ee06` for the pattern (return type → nullable, or throw typed `BaseError`). **Caveat for spot-check W mutations**: a mutation can also flip from a clean typed error to ISE because an earlier mutation in the same run changed shared state (e.g. publishing a version then operating on it). When triaging, re-fire the suspect call against a fresh fixture in isolation — if it returns a typed `E0xxx` there, it's a sequence artifact, not a real bug. |
| `OTHER_ERROR` | Same as above, jq missing |

### Expected pattern

| Tier | OWNER | ADMIN | VIEWER | ELSEWHERE |
|---|---|---|---|---|
| **R** (read) | OK | OK | OK | E0013 |
| **W** (write) | OK | OK | E0013 | E0013 |
| **O** (owner) | OK | E0013 | E0013 | E0013 |

**Cross-project (any tier, both directions)**: E0013 for every endpoint. Any
deviation is a real IDOR.

## Workflows

### Adding/renaming a GraphQL endpoint

1. Add `@RequirePermission` to the new resolver method
2. Add a row to [`e2e/endpoints.ts`](./e2e/endpoints.ts) (`key`, `tier`, `op`, `doc`, `vars`)
3. Add an entry to [`../src/auth/permission/endpoint-capability.map.ts`](../src/auth/permission/endpoint-capability.map.ts) (capability oracle)
4. Update the count assertion in [`permission.e2e-spec.ts`](./e2e/permission.e2e-spec.ts) (`toHaveLength(93)`)
5. Run `pnpm test:e2e --testPathPattern permission` — fix the new row's vars until it passes
6. Run `pnpm smoke:spot-check-gen` to refresh `spot-check.sh`

### Investigating a permission anomaly on dev

```bash
eval "$(pnpm --silent smoke:spot-check-prep)"
pnpm smoke:spot-check --queries-only --show-curl > /tmp/sc.out
# Find rows that don't match the expected pattern:
grep -E '→ ' /tmp/sc.out | grep -vE '→ OK$|→ E0013$'
# Each remaining row deserves a look. The accompanying curl in the output
# is ready to paste/modify for hand investigation.
pnpm smoke:spot-check-teardown
```

### Spotting cross-project IDOR

The Cross-project section in spot-check fires every endpoint as `[A→B]` (A's
OWNER touching B's resources) and `[B→A]` (B's OWNER touching A's resources).
All should be `E0013`. Any `OK` / `OTHER_ERROR` / `Internal Server Error` is a
real cross-project leak — investigate.

## Source-of-truth principle

The three test surfaces **must stay in sync** with each other. They achieve
this by all reading from [`e2e/endpoints.ts`](./e2e/endpoints.ts):

```
                     e2e/endpoints.ts (93 rows)
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
permission.e2e-spec.ts  smoke/permissions.ts   smoke/gen-spot-check.ts
                                                       │
                                                       ▼
                                                smoke/spot-check.sh (generated)
```

If you change the table, e2e + Node smoke pick up the change automatically.
**Always re-run `pnpm smoke:spot-check-gen` after editing the table** — the
generated `spot-check.sh` is committed alongside the generator.

## Token minting (manual)

If prep isn't enough and you need a one-off token:

```bash
JWT_PATH=$(find $PWD/../../node_modules/.pnpm -maxdepth 2 -name 'jsonwebtoken@*' | head -1)/node_modules/jsonwebtoken
node -e "console.log(require('$JWT_PATH').sign({userId:'<USER_ID>'}, process.env.JWT_SECRET || 'test', {expiresIn:'2h'}))"
```

Local dev defaults `JWT_SECRET=test` in `.env`.

## Files

```
test/
├── README.md                  this file
├── jest-e2e.json              jest config (e2e)
├── load-test-env.ts           DATABASE_URL loader for e2e (reads .env.test)
├── setup-e2e.ts               jest setupFiles entry
├── global-setup-e2e.ts        jest globalSetup: runs `prisma migrate deploy`
├── e2e/
│   ├── endpoints.ts           SHARED 93-endpoint table
│   ├── permission.e2e-spec.ts jest contract test
│   ├── factories.ts           Prisma fixture factories (createProject etc.)
│   ├── auth.ts                signToken + graphql + isPermissionDenied helpers
│   └── create-test-app.ts     boots the AppModule once per spec
└── smoke/
    ├── permissions.ts         Node fetch runner (automated, env-driven)
    ├── spot-check.sh          GENERATED bash + curl runner
    ├── gen-spot-check.ts      regenerates spot-check.sh from endpoints.ts
    ├── prep-fixture.ts        seeds + mints tokens (state file at /tmp)
    └── teardown-fixture.ts    cleans up by state file id (rename-resistant)
```
