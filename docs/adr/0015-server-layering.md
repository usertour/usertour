# 0015: Server layering — entrypoints, domain, platform

- **Date:** 2026-09-19
- **Status:** Accepted

## Context

`apps/server/src` is 32 flat top-level directories. Protocol surfaces (REST v2 in `api/`, REST v1 in `openapi/`, MCP in `mcp/`, the websocket gateways), business modules (`content/`, `themes/`, `localizations/`, …) and infrastructure (`common/`, `shared/`, `utils/`, …) sit side by side, and nothing in the tree says which is which.

GraphQL, REST and MCP are protocols; the business rules behind them should exist once. Two things show they do not:

- **Rules live in one surface.** The rules of writing a version translation were first written into the REST v2 service; the dashboard keeps its own copy in the browser; the domain had none (moved into `VersionTranslationService` since). Publish-time usability validation, write guards and per-type auto-start checks live under `api/content-representation/` and run only on the API path — the dashboard's GraphQL path goes straight to `ContentService` and skips them. Nothing in the directory layout signalled that `api/` should hold adaptation only.
- **Services depend on the GraphQL surface.** In 10 of the 12 business directories, services take `@nestjs/graphql` input classes as parameters, so REST and MCP build GraphQL-shaped inputs to call them and the dependency points from the service to the protocol.

Measured at decision time, 18 imports point from a lower layer to a higher one (listed under Known debt).

We studied the layout of a large open-source NestJS product whose tree reads very cleanly. What makes it clean is a split between a platform and the applications built on it, and feature folders that are complete on their own; its feature resolvers and controllers (over a hundred) live inside their feature folders, and its API folder holds only a generic, metadata-driven record API. It also has 131 files importing across its own platform/application boundary in the wrong direction, with no rule guarding it.

## Decision

### 1. Three layers

| Layer | Contains | Job |
|---|---|---|
| **entrypoints** | Protocol surfaces heavy enough to be trees of their own: REST v2 (`api/`), REST v1 (`openapi/`), MCP (`mcp/`), the websocket gateways (`web-socket/` except `core/`) | Parse a request, map a result to the wire format, translate errors. A REST v2 or MCP surface also owns its external representation — the content codec, zod contracts, the tool registry — which is protocol and is why these are separate trees. |
| **domain** | Business modules. Each is self-contained: its services, its pure logic, and its thin GraphQL adapter (the resolver and `dtos/`) side by side | What is valid, what state allows a write, what a write leaves behind. |
| **platform** | Infrastructure that knows no business concept: `common/`, `shared/`, `utils/`, `ai/`, `outbound/`, `adapters/`, `license/` | — |

A rule belongs to the domain when every other entrypoint should obey it too.

The GraphQL adapter stays inside its module. Co-location is the NestJS convention, the product studied does the same, and a separate GraphQL tree would scatter one feature across two roots. What is fixed is the dependency direction, not the folder.

### 2. Dependency rules

- A layer may import itself and the layers below it: **entrypoints → domain → platform**. Never upward. Domain modules may import each other.
- The composition root (`src/*.ts`: `main.ts`, `app.module.ts`, …) may import anything; nothing imports it.
- **Inside `src/domain/`**, a service or pure-logic file must not import `@nestjs/graphql`, anything under a module's `dtos/`, or a `*.resolver`. Services take plain types declared in `types/`; the GraphQL inputs `implements` them. Resolvers depend on services, never the reverse.

### 3. Inside a domain module

```
domain/<module>/
  <module>.module.ts
  <module>.resolver.ts      resolvers/ once there are several
  dtos/                     the GraphQL adapter: *.input.ts (inputs and args), *.dto.ts (object types)
  services/                 *.service.ts
  types/                    *.type.ts — the plain types the services take
  utils/                    *.util.ts
  constants/                *.constant.ts
```

One export per file, the file named after it in kebab-case (`create-localization.input.ts`, `localization-audit-snapshot.util.ts`). Only the module and its main resolver sit at the module root. This is the layout of the product studied, where it holds for nine files in ten.

Object types carry a `DTO` class suffix and name their GraphQL type explicitly — `@ObjectType('Localization') class LocalizationDTO`. The suffix shows the layer at every import, and keeps the GraphQL class apart from the Prisma model of the same name that domain services work with; the explicit name means renaming a class can never rename a public GraphQL type. Inputs keep the `…Input` names they already have and no explicit name. The product studied does the same for four object types in five.

Moving a module into this layout leaves the generated schema byte-identical: files are renamed, input classes keep their names, and object types that gain the suffix pin their existing name.

### 4. Enforcement

`apps/server/src/layering.spec.ts` holds a layer map (path prefix → layer, longest prefix wins) and scans every import. It fails on:

- an import pointing upward that is not in the known-violations ledger;
- a ledger entry that no longer occurs (the ledger may only shrink);
- a top-level directory the map does not classify, or a map entry whose path no longer exists;
- the file-level rule above, for anything under `src/domain/`.

A test rather than a linter: Biome 1.9's restricted imports cannot express path patterns, and the server's ESLint has no configuration. The test follows the existing tripwires (MCP e2e coverage, REST audit coverage): a registry in code, and a test that refuses to let it drift from reality.

The layer map is the migration status table. It lives in code, not in this record.

### 5. Target layout and incremental migration

```
src/
  domain/<module>/        business modules
  entrypoints/<surface>/  rest-v2, rest-v1, mcp, websocket
  platform/<concern>/     infrastructure
```

- New modules go straight into the target layout.
- An existing module moves when it is next substantially changed, never for the sake of moving. Moving one means decoupling its service signatures first, then `git mv` and import updates.
- `api/`, `openapi/`, `mcp/` and `web-socket/` are already cohesive. They are classified in place and will be renamed into `entrypoints/` later, each as a whole directory in one step.
- Consolidating `common/`, `shared/`, `utils/` and `utilities/` is out of scope; they are classified in place.
- Pilot: `localizations/` — service signatures decoupled, then moved to `src/domain/localizations/` in the layout of §3.

### 6. Known debt

**Upward imports** (in the ledger, 18 at decision time):

1. **Content pushes to the websocket gateways directly** — `content.module` and `content.service` import the gateways, and `web-socket/core/content-orchestrator` imports a v2 gateway DTO (4). Direction: the domain emits an event; the gateway listens.
2. **Integrations and outbound webhooks build their payloads with REST v2 mappers** — `api/events/event.mapper`, `api/users/users.mapper`, `api/companies/companies.mapper`, `api/shared/object-type`, `api/shared/codename` (8). The public object shape is shared by the v2 API and outbound payloads on purpose; it needs a home both can import — a representation module shared by the entrypoints and the outbound channel, or outbound delivery treated as an entrypoint of its own.
3. **`common/` holds business code** — project initialization defaults, the attribute filter, REST v1 types and the environment decorator import domain models (6). They belong in domain modules or the v1 entrypoint.

**Rules in the wrong layer** (invisible to the test — they are imports in the allowed direction):

4. Publish-time usability validation, write guards and auto-start capability checks under `api/content-representation/`, and the dashboard's browser-side translation save. Moving them is its own piece of work; it starts by running the usability validator read-only over existing published versions, to learn how much of what the builder produced it would reject.

## Consequences

- The layer of any file can be read from its path once its module has moved, and from the layer map until then.
- A business rule written into a protocol surface still passes the test (the import direction is legal); the test guards structure, review guards placement. Rule 1's criterion — would another entrypoint have to obey it? — is what review applies.
- Two layouts coexist for a long time. The layer map and the shrink-only ledger keep the half-migrated state visible instead of silent.
- Every module move changes import paths and can conflict with open branches; large modules (`content/`) need a quiet moment.
- `web-socket/core/` is classified as domain although it also contains socket plumbing next to the delivery runtime; splitting it waits for its next substantial change.

## Alternatives Considered

- **A separate GraphQL tree (resolvers moved out of their modules)** — rejected. It scatters a feature across two roots, runs against the NestJS convention, and the product studied does not do it either. The coupling problem is the direction of types, which rule 2 fixes without moving files.
- **Mirroring the studied product's platform/applications split** — rejected. That split separates a metadata-driven platform from the standard objects built on it. Our content model is not metadata-driven — each content type has dedicated code — so nearly everything would land on the application side and the split would say nothing.
- **Moving all 32 directories at once** — rejected. It conflicts with every open branch and external pull request at the same time and produces an unreviewable diff. Incremental moves under an enforced rule get the same end state.
- **Moving directories without enforcing the direction** — rejected. Tidy folders without enforcement decay; the product studied is the example.
- **A linter rule (Biome restricted imports, an ESLint boundaries plugin)** — deferred, not rejected: see Enforcement.

## Triggers to Revisit

- Biome gains path-pattern restricted imports, or the server gets a working ESLint setup — move enforcement to the linter.
- The ledger grows instead of shrinking over two releases — the layering does not fit how the code wants to depend; reopen the layer definitions.
- GraphQL adapters grow their own representation layer (as REST v2 has) — reconsider giving GraphQL its own tree.
