import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { orderByField, singleOrArray } from '../shared/query';

import { nameSearchField } from '../shared/filters';
import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

/**
 * v2 environments — read-only project metadata. An environment is where content
 * is published and where users / companies / sessions live; this endpoint lets a
 * caller discover the environment ids the env-scoped routes (and `publish`) accept.
 */
export const environment = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.ENVIRONMENT),
  name: z.string().nullable(),
  isPrimary: z.boolean(),
  token: z
    .string()
    .describe(
      "The environment's SDK token — pass it to usertour.init() to load this environment's published content.",
    ),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class EnvironmentDto extends createZodDto(environment) {}

export const listEnvironmentsQuery = z.object({
  limit,
  cursor,
  ...nameSearchField,
  orderBy: singleOrArray(orderByField).describe('Order by createdAt / -createdAt.'),
});
export class ListEnvironmentsQueryDto extends createZodDto(listEnvironmentsQuery) {}

export const listEnvironmentsResponse = z.object({
  results: z.array(environment),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListEnvironmentsResponseDto extends createZodDto(listEnvironmentsResponse) {}

// `isPrimary` is not settable here — switching the primary environment is an
// admin operation with project-wide side effects; this surface only names envs.
export const createEnvironmentBody = z.object({
  name: z.string().min(1).describe('Environment name.'),
});
export class CreateEnvironmentBodyDto extends createZodDto(createEnvironmentBody) {}

export const updateEnvironmentBody = z.object({
  name: z.string().min(1).describe('Environment name.'),
});
export class UpdateEnvironmentBodyDto extends createZodDto(updateEnvironmentBody) {}

export type Environment = z.infer<typeof environment>;
export type ListEnvironmentsQuery = z.infer<typeof listEnvironmentsQuery>;
export type CreateEnvironmentBody = z.infer<typeof createEnvironmentBody>;
export type UpdateEnvironmentBody = z.infer<typeof updateEnvironmentBody>;
