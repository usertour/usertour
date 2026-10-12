import { GraphQLScalarType } from 'graphql';

/**
 * A scalar that serialises exactly like `base` under its own name. The schema
 * then says what a JSON, Int or String field carries, and the dashboard's
 * codegen maps the name to the domain type. The serialised values do not
 * change; a document that declares a variable as the base type has to name
 * the scalar instead.
 */
export const namedScalar = (base: GraphQLScalarType, name: string, description: string) =>
  new GraphQLScalarType({ ...base.toConfig(), name, description });
