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
export function ConditionEditor({ schema, condition, onChange, onClose }: Props) {
  const { Editor } = schema;
  return <Editor condition={condition} onChange={onChange} onClose={onClose} />;
}
