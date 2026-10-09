// GraphQL Code Generator — typed documents for the dashboard (ADR 0021).
//
// Schema: the SDL the server emits from its resolvers (`pnpm --filter
// @usertour/server schema:emit`; the file itself is gitignored) plus the
// dashboard's client-only schema (`@client` fields). Documents: every gql tag
// under src/gql, and any .graphql operation file. Output: one file with the
// schema types, each operation's result and variables types, and a
// TypedDocumentNode per operation — split into schema types and operation
// types. `pnpm gql:generate` at the repo root runs both steps; CI fails when
// the committed output is stale.
const sharedConfig = {
  useTypeImports: true,
  scalars: {
    DateTime: 'string',
    JSON: 'unknown',
    JWT: 'string',
  },
};

/** @type {import('@graphql-codegen/cli').CodegenConfig} */
module.exports = {
  schema: ['../../apps/server/src/schema.graphql', '../../apps/web/src/apollo/type-defs/index.ts'],
  documents: ['src/gql/**/*.ts', 'src/operations/**/*.graphql'],
  generates: {
    // Schema types: every object, input, enum and scalar of the schema.
    'src/generated/schema.ts': {
      plugins: ['typescript'],
      config: sharedConfig,
    },
    // Operation types and documents. The operations plugin would otherwise
    // emit its own copy of every input type an operation uses;
    // importSchemaTypesFrom (resolved from the package root) makes it reference
    // schema.ts instead.
    'src/generated/operations.ts': {
      plugins: ['typescript-operations', 'typed-document-node'],
      config: { ...sharedConfig, importSchemaTypesFrom: './src/generated/schema' },
    },
  },
};
