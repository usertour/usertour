import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { WebZIndex } from '@usertour-packages/constants';
import { Rules } from '@usertour-packages/shared-components';
import type { RulesCondition } from '@usertour/types';
import { sectionLabelClass } from '../ui/tokens';

interface Props {
  conditions: RulesCondition[];
  onConditionsChange: (conditions: RulesCondition[]) => void;
  disabled?: boolean;
}

export function ConditionsSection({ conditions, onConditionsChange, disabled }: Props) {
  const { attributeList } = useAttributeListContext();

  return (
    <div className="space-y-2 border-b border-border/50 px-3 py-3">
      <div className={sectionLabelClass}>Conditions</div>
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
