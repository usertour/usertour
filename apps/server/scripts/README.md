# scripts/ — ships into the production image

Everything in this directory is copied into the production Docker image
(Dockerfile picks files by name) and must run on **bare node** — plain
JavaScript only, no TypeScript, no dev dependencies.

Dev/review tooling does NOT belong here — put it in `../tools/` (TypeScript
welcome there; it runs via `tsx` and is excluded from the build). A `.ts` file
placed here once got swept into `nest build`, which nested the dist layout and
crashed the production entrypoint (`dist/main` → MODULE_NOT_FOUND); the build
excludes this directory as a belt, but the convention is the real fence.
