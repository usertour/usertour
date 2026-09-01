# Usertour Zapier integration

The Zapier app shell. It contains no delivery logic of its own: triggers are
REST hooks that create ordinary Usertour webhooks (so delivery rides the
standard outbound pipeline — retries, circuit breaker, message log), and
actions map onto the public v2 REST API.

This package is deliberately **outside the pnpm workspace** — it is built and
deployed by the Zapier Platform CLI, not by the monorepo toolchain.

## Layout

- `authentication.js` — custom auth: server URL (self-host friendly) + API
  token, validated against `GET /v2/me`.
- `triggers/hook.js` — the REST-hook factory (subscribe = `POST /v2/.../webhooks`,
  unsubscribe = `DELETE`, perform = flatten the webhook envelope).
- `triggers/index.js` — the visible triggers, one per webhook topic.
- `triggers/hidden.js` — project/environment dropdowns, fed by `/v2/me`.
- `creates/upsert-user.js` — Create or Update User (`PUT /v2/.../users/:id`).

## Develop and deploy

```bash
cd integrations/zapier
npm install
npx zapier validate      # static checks
npx zapier login         # once, with the Usertour Zapier account
npx zapier register      # first time only — creates the app, writes .zapierapprc
npx zapier push          # deploy the current definition
```

`.zapierapprc` (the app binding) and credentials stay untracked.

## Releasing

Zapier apps go private → beta (invite link, shareable in docs) → public
(requires active users + Zapier review). `npx zapier promote <version>` and
the developer dashboard drive that lifecycle.
