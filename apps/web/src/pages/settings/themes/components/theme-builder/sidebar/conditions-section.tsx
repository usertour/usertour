import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { WebZIndex } from '@usertour-packages/constants';
import { Rules } from '@usertour-packages/shared-components';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import type { RulesCondition } from '@usertour/types';

interface Props {
  conditions: RulesCondition[];
  onConditionsChange: (conditions: RulesCondition[]) => void;
  // Name of the variation these conditions belong to. Surfacing it in the
  // header makes it obvious what's being edited when the user switches
  // between variations.
  variationName: string;
  disabled?: boolean;
}

export function ConditionsSection({
  conditions,
  onConditionsChange,
  variationName,
  disabled,
}: Props) {
  const { attributeList } = useAttributeListContext();

  return (
    <div className="space-y-2 border-b border-border/50 px-3 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>
          Apply{' '}
          <span className="font-medium text-foreground">{variationName || 'this variation'}</span>{' '}
          when
        </span>
        <QuestionTooltip>
          This variation overrides the Base theme when its conditions match the current user. All
          matching variations are applied in the order shown in the list — drag to reorder.
        </QuestionTooltip>
      </div>
      <Rules
        onDataChange={(conds) => onConditionsChange(conds)}
        defaultConditions={conditions}
        isHorizontal={true}
        isShowIf={false}
        filterItems={['group', 'user-attr', 'current-page']}
        addButtonText="Add condition"
        attributes={attributeList || []}
        disabled={disabled}
        baseZIndex={WebZIndex.RULES}
      />
    </div>
  );
}
