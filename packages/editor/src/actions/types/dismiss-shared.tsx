import { CloseCircleIcon } from '@usertour-packages/icons';
import type { RulesCondition } from '@usertour/types';
import { useActionsT, useSummaryTextClass } from '../actions-context';
import type { ActionTypeSchema } from '../schema-types';

// Shared factory for the four dismiss variants — flow / launcher / checklist
// / banner. The persisted data shape is the same (empty object), only the
// summary label and i18n key differ. Editor is omitted so ActionRow renders
// a static chip with no popover, matching v1 actions-dismis.tsx.

interface DismissSchemaConfig {
  type: string;
  labelKey: string;
  summaryKey: string;
}

function buildSummary(summaryKey: string) {
  const Summary = ({ condition: _condition }: { condition: RulesCondition }) => {
    const t = useActionsT();
    const summaryTextClass = useSummaryTextClass();
    return (
      <span className="inline-flex min-w-0 items-center gap-2">
        <CloseCircleIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className={summaryTextClass}>
          <span className="font-semibold">{t(summaryKey)}</span>
        </span>
      </span>
    );
  };
  Summary.displayName = `DismissSummary(${summaryKey})`;
  return Summary;
}

export function dismissSchema(
  config: DismissSchemaConfig,
): ActionTypeSchema<Record<string, never>> {
  return {
    type: config.type,
    labelKey: config.labelKey,
    Icon: CloseCircleIcon,
    defaultData: () => ({}),
    Summary: buildSummary(config.summaryKey),
  };
}
