/**
 * CJS-loadable stand-in for the ESM-only AI SDK packages, mapped in via
 * moduleNameMapper. Jest's module registry cannot load ESM through require
 * (the Node 22 runtime can — production is unaffected), and no test may call
 * the LLM anyway: unit tests only reflect metadata, and the permission e2e
 * never exercises the mutation's allow direction.
 */
export const createAnthropic = () => () => ({});

export const createOpenAICompatible = () => () => ({});

export const jsonSchema = (schema: unknown) => schema;

export const generateObject = async (): Promise<never> => {
  throw new Error('AI SDK stub: generateObject must not be called from tests');
};
