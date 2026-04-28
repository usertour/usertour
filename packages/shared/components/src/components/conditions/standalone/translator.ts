import type { ConditionsTranslator } from '../conditions-context';

// Standalone components live outside any ConditionsProvider, so each accepts
// an optional `t` prop. This helper returns the prop or a passthrough that
// echoes the key — keeps the components renderable in tests / runtime SDK
// contexts that don't wire up i18n.
export const resolveTranslator = (t?: ConditionsTranslator): ConditionsTranslator =>
  t ?? ((key: string) => key);
