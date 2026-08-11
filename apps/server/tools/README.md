# tools/ — local dev & review tooling, never shipped

TypeScript utilities run locally against source (`npx tsx tools/<name>.ts …`;
some need `DATABASE_URL` — see each file's header). Excluded from `nest build`
(tsconfig.build.json) and never copied into the Docker image.

Production-shipped scripts live in `../scripts/` instead, which is plain-JS
only — see its README for why the split exists.
