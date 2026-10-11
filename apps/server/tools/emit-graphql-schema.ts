/**
 * Emit the GraphQL SDL the server would write on boot, without booting it.
 *
 * The running server writes `src/schema.graphql` (code-first, `autoSchemaFile`)
 * and the file is gitignored, so there is no schema on disk in CI or on a
 * fresh clone. The dashboard's typed documents are generated from the schema
 * (ADR 0021), so this builds it the way Nest does — from the resolver classes'
 * metadata — with no database, Redis or HTTP server involved.
 *
 * Run:  pnpm --filter @usertour/server schema:emit
 * Out:  apps/server/src/schema.graphql (the same path and header the server uses)
 */
import 'reflect-metadata';
import { readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import { GRAPHQL_SDL_FILE_HEADER } from '@nestjs/graphql/dist/graphql.constants';
import { lexicographicSortSchema, printSchema } from 'graphql';

// Mirrors `GqlConfigService.createGqlOptions()` and `config.graphql`.
const BUILD_SCHEMA_OPTIONS = { numberScalarMode: 'integer' as const };
const SORT_SCHEMA = true;
const RESOLVER_TYPE_METADATA = 'graphql:resolver_type';

type ResolverClass = new (...args: never[]) => unknown;

const serverRoot = resolve(__dirname, '..');
const outFile = resolve(serverRoot, 'src/schema.graphql');

const resolverFiles = (): string[] =>
  readdirSync(join(serverRoot, 'src'), { recursive: true, encoding: 'utf8' })
    .filter((entry) => entry.endsWith('.resolver.ts'))
    .map((entry) => join(serverRoot, 'src', entry))
    .sort();

const collectResolvers = (): ResolverClass[] => {
  const files = resolverFiles();
  const resolvers: ResolverClass[] = [];
  for (const file of files) {
    const exported = require(file) as Record<string, unknown>;
    for (const value of Object.values(exported)) {
      if (typeof value === 'function' && Reflect.hasMetadata(RESOLVER_TYPE_METADATA, value)) {
        resolvers.push(value as ResolverClass);
      }
    }
  }
  return resolvers;
};

const main = async () => {
  const resolvers = collectResolvers();
  if (resolvers.length === 0) {
    throw new Error('No resolver classes found under src/**/*.resolver.ts');
  }
  const app = await NestFactory.create(GraphQLSchemaBuilderModule, { logger: false });
  await app.init();
  const factory = app.get(GraphQLSchemaFactory);
  const built = await factory.create(resolvers, BUILD_SCHEMA_OPTIONS);
  const schema = SORT_SCHEMA ? lexicographicSortSchema(built) : built;
  writeFileSync(outFile, GRAPHQL_SDL_FILE_HEADER + printSchema(schema));
  await app.close();
  process.stdout.write(`wrote ${outFile} from ${resolvers.length} resolvers\n`);
};

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exit(1);
});
