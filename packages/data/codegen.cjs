// GraphQL Code Generator — typed documents for the dashboard (ADR 0021).
//
// Schema: the SDL the server emits from its resolvers (`pnpm --filter
// @usertour/server schema:emit`; the file itself is gitignored) plus the
// dashboard's client-only schema (`@client` fields). Documents: the .graphql
// operation files in src/documents, named after the entity or the hook module
// that owns them (a document named like a module in src/hooks is that module's).
// Output: two files — the schema types,
// and each operation's result and variables types with its TypedDocumentNode.
// `pnpm gql:generate` at the repo root runs both steps; CI fails when the
// committed output is stale.
const sharedConfig = {
  useTypeImports: true,
  // Enums as string-literal unions: the dashboard's domain types carry the
  // same values as plain strings, and a union meets them at the hook boundary
  // without a cast through unknown.
  enumsAsTypes: true,
  scalars: {
    // Serialised as ISO text; a Date sent in a variable serialises to the same.
    DateTime: { input: 'string | Date', output: 'string' },
    JSON: 'unknown',
    // The stored attribute bags (user, company, membership, event).
    JSONObject: '@usertour/types#StoredAttributes',
    JWT: 'string',
    // Named scalars: the server declares what a JSON, Int or String field
    // carries, and each name maps to the domain type that describes it.
    AnalyticsViewsByBlock: '@usertour/types#AnalyticsViewsByBlock',
    AnalyticsViewsByDay: '@usertour/types#AnalyticsViewsByDay',
    AnalyticsViewsByStep: '@usertour/types#AnalyticsViewsByStep',
    AnalyticsViewsByTask: '@usertour/types#AnalyticsViewsByTask',
    AttributeBizType: '@usertour/types#AttributeBizTypes',
    AttributeDataType: '@usertour/types#BizAttributeTypes',
    ContentConfig: '@usertour/types#ContentConfig',
    ContentQuestionAnalytics: '@usertour/types#ContentQuestionAnalytics',
    ContentType: '@usertour/types#ContentDataType',
    LocalizedContent: '@usertour/types#LocalizedContent',
    RulesCondition: '@usertour/types#RulesCondition',
    SegmentColumn: '@usertour/types#ColumnSetting',
    // Shaped per content type; the reader narrows it.
    SessionState: 'unknown',
    StepScreenshot: '@usertour/types#StepScreenshot',
    StepSettings: '@usertour/types#StepSettings',
    StepTarget: '@usertour/types#ElementSelectorPropsData',
    StepTrigger: '@usertour/types#StepTrigger',
    ThemeSettings: '@usertour/types#ThemeTypesSetting',
    ThemeVariation: '@usertour/types#ThemeVariation',
    VersionConfig: '@usertour/types#ContentConfigObject',
  },
  // Enums the domain declares as TypeScript enums: the generated types use
  // those enums instead of a string-literal union, so a value flows from a
  // document into domain code without a cast.
  enumValues: {
    Role: '@usertour/types#Role',
    SubscriptionPlanType: '@usertour/types#PlanType',
  },
};

/** @type {import('@graphql-codegen/cli').CodegenConfig} */
module.exports = {
  schema: ['../../apps/server/src/schema.graphql', '../../apps/web/src/apollo/type-defs/index.ts'],
  documents: ['src/documents/**/*.graphql'],
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
