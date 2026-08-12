# Publishing the v2 API reference

How the public v2 API reference (in the separate `usertour/docs` Mintlify site)
is generated and kept in sync with this server. **If you change a v2 endpoint or
its schema, refresh the snapshot (below) so the published docs don't drift.**

## How it works

The v2 API is contract-first (zod → OpenAPI), so the reference is **generated
from the spec**, not hand-written:

1. **Server** emits a v2-only OpenAPI document at **`/api-v2-json`** (UI at
   `/api-v2`). It is built in `apps/server/src/main.ts` from `ApiModule` only,
   run through `normalizeOpenApiParameters` (see below). It is **host-agnostic** —
   no `servers` — because the published host is the docs site's concern.
2. **Docs repo (`usertour/docs`)** commits a **snapshot** at
   `api-reference-v2/openapi.json` and points `docs.json` at that file
   (`"openapi": "/api-reference-v2/openapi.json"`). Mintlify auto-generates a page
   per operation.

A committed snapshot (not a live URL) is deliberate: it is versioned and
reviewable with the docs, the docs build has no runtime dependency on the server,
and `mint dev` works locally (it does not fetch remote OpenAPI URLs).

## Refreshing after a v2 API change

In the **docs repo**, with a server running (local or prod):

```bash
# committed snapshot (stamps the prod host into `servers`)
./scripts/refresh-v2-openapi.sh                 # pulls localhost:3001, host → https://api.usertour.io

# local preview (playground hits your local server)
./scripts/refresh-v2-openapi.sh http://localhost:3001 http://localhost:3001
mint dev --port 3333
```

The script pulls `/api-v2-json` and stamps `servers` with the docs' chosen public
host — so the host lives in the docs repo, never in this server.

## Two server-side facts to keep working

- **`normalizeOpenApiParameters`** (`src/common/openapi/normalize-parameters.ts`)
  fixes union query params (the `singleOrArray` helper) that nestjs-zod renders
  with `anyOf` at the parameter top level — invalid OpenAPI that strict validators
  (Mintlify, swagger-parser) reject. It runs for both `/api` (v1+v2) and
  `/api-v2`. An e2e in `event-definitions.e2e-spec.ts` guards it.
- Operation **`summary`** is the docs nav title. Follow the v1 convention:
  `List <plural>` / `Get a <singular>` / `Create|Update|Delete|… a <singular>` —
  no "by ID", no parentheticals; put detail in `description`.
