import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { WebZIndex } from '@usertour-packages/constants';
import { Rules } from '@usertour-packages/shared-components';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import type { RulesCondition } from '@usertour/types';
import { Trans, useTranslation } from 'react-i18next';

interface Props {
  conditions: RulesCondition[];
  onConditionsChange: (conditions: RulesCondition[]) => void;
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
  const { t } = useTranslation();
  const displayName = variationName || t('themeBuilder.chrome.thisVariation');

  return (
    <div className="space-y-2 border-b border-border/50 px-3 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>
          <Trans
            i18nKey="themeBuilder.chrome.applyWhen"
            values={{ name: displayName }}
            components={{ 1: <span className="font-medium text-foreground" /> }}
          />
        </span>
        <QuestionTooltip>{t('themeBuilder.tooltips.applyWhen')}</QuestionTooltip>
      </div>
      <Rules
        onDataChange={(conds) => onConditionsChange(conds)}
        defaultConditions={conditions}
        isHorizontal={true}
        isShowIf={false}
        filterItems={['group', 'user-attr', 'current-page']}
        addButtonText={t('themeBuilder.actions.addCondition')}
        attributes={attributeList || []}
        disabled={disabled}
        baseZIndex={WebZIndex.RULES}
      />
    </div>
  );
}
