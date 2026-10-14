import type { RulesCondition } from '@usertour/types';
import type { AnySchema } from './schema-types';

// Thin dispatcher that picks the schema's Editor component and forwards
// state. Lives separately from ActionRow so the popover content can be
// reused (e.g., tests, storybook) without dragging the row chrome along.
interface Props {
  schema: AnySchema;
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
  onClose: () => void;
}

export function ActionEditor({ schema, condition, onChange, onClose }: Props) {
  const Editor = schema.Editor;
  if (!Editor) return null;
  return <Editor condition={condition} onChange={onChange} onClose={onClose} />;
}
