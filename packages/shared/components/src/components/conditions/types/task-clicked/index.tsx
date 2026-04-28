import { TaskClickedIcon } from '@usertour-packages/icons';
import { useConditionsT } from '../../conditions-context';
import type { ConditionTypeSchema } from '../../schema-types';

// Task-is-clicked has no configurable data — the chip is purely declarative
// ("checklist task is clicked"). The Editor returns null because there is
// nothing to edit; clicking the chip toggles the popover open then closed
// with no effect.

const Summary = () => {
  const t = useConditionsT();
  return (
    <span className="inline-flex items-center gap-2">
      <TaskClickedIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span>{t('conditions.types.taskClicked.summary')}</span>
    </span>
  );
};

const Editor = () => null;

export const taskClickedSchema: ConditionTypeSchema<Record<string, never>> = {
  type: 'task-is-clicked',
  labelKey: 'conditions.types.taskClicked.label',
  Icon: TaskClickedIcon,
  defaultData: () => ({}),
  Summary,
  Editor,
};
