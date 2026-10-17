import type { RulesCondition } from '@usertour/types';
import type { AnySchema } from './schema-types';

interface Props {
  schema: AnySchema;
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
  onClose: () => void;
}

// Thin dispatcher that forwards the row's full condition + onChange to the
// schema's Editor. Editors own their own form layout and action buttons.
// ConditionRow short-circuits to a static chip when the schema has no
// Editor, so this dispatcher always receives one.
export function ConditionEditor({ schema, condition, onChange, onClose }: Props) {
  const { Editor } = schema;
  if (!Editor) return null;
  return <Editor condition={condition} onChange={onChange} onClose={onClose} />;
}
