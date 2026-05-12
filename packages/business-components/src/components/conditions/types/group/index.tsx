import { GroupIcon } from '@usertour-packages/icons';
import type { RulesCondition } from '@usertour/types';
import { useConditionsT } from '../../conditions-context';
import type { ConditionTypeSchema } from '../../schema-types';

// `group` is structurally different from leaf condition types — its UI is a
// recursive list, not a popover. ConditionRow detects type === 'group' and
// renders ConditionList directly. The Summary / Editor below are placeholders
// kept only so the registry shape stays uniform; they are never actually
// mounted by the row.

const GroupSummary = ({ condition }: { condition: RulesCondition }) => {
  const t = useConditionsT();
  const count = condition.conditions?.length ?? 0;
  return (
    <span className="inline-flex items-center gap-2">
      <GroupIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span>{t('conditions.types.group.summary', { count })}</span>
    </span>
  );
};

const GroupEditor = () => null;

export const groupSchema: ConditionTypeSchema<Record<string, never>> = {
  type: 'group',
  labelKey: 'conditions.types.group.label',
  Icon: GroupIcon,
  defaultData: () => ({}),
  defaultConditions: () => [],
  Summary: GroupSummary,
  Editor: GroupEditor,
  // Group itself is always valid — its child conditions are validated
  // recursively by the surrounding ConditionList.
  validate: () => undefined,
};
