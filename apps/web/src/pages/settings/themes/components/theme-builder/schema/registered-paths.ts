import { builderSections } from './sections';
import type { FieldDef } from './types';

const expandFieldPaths = (field: FieldDef): string[] => {
  if (field.type === 'placement') {
    return [
      `${field.path}.position`,
      `${field.path}.positionOffsetX`,
      `${field.path}.positionOffsetY`,
    ];
  }
  return [field.path];
};

// Every leaf path the new builder UI can write to. The schema-snapshot test
// asserts this set is a superset of the canonical ThemeTypesSetting paths,
// so any field unreachable from the UI fails the build.
export const BUILDER_REGISTERED_PATHS: readonly string[] = [
  ...new Set(builderSections.flatMap((section) => section.fields.flatMap(expandFieldPaths))),
].sort();
