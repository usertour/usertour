import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useEventListContext } from '@/contexts/event-list-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { WebZIndex } from '@usertour-packages/constants';
import { Label } from '@usertour-packages/label';
import {
  Rules,
  RulesFrequency,
  RulesIfCompleted,
  RulesPriority,
  RulesWait,
} from '@usertour-packages/shared-components';
import { useContentListQuery } from '@usertour-packages/shared-hooks';
import { deepClone, getAuthToken } from '@usertour/helpers';
import { conditionsIsSame } from '@usertour/helpers';
import { Switch } from '@usertour-packages/switch';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import {
  Content,
  ContentPriority,
  Frequency,
  RulesCondition,
  autoStartRulesSetting,
} from '@usertour/types';
import { useCallback, useId, useState, useEffect } from 'react';

export enum ContentDetailAutoStartRulesType {
  START_RULES = 'start-rules',
  HIDE_RULES = 'hide-rules',
}

interface ContentDetailAutoStartRulesProps {
  defaultEnabled: boolean;
  name: string;
  defaultConditions: RulesCondition[];
  onDataChange: (enabled: boolean, conditions: RulesCondition[], setting: any) => void;
  content: Content;
  setting: autoStartRulesSetting;
  type: ContentDetailAutoStartRulesType;
  featureTooltip: React.ReactNode;
  showWait?: boolean;
  showFrequency?: boolean;
  showIfCompleted?: boolean;
  showPriority?: boolean;
  showAtLeast?: boolean;
  disabled?: boolean;
  filterItems?: string[];
  showEnabledSwitch?: boolean;
}

export const ContentDetailAutoStartRules = (props: ContentDetailAutoStartRulesProps) => {
  const {
    defaultEnabled,
    name,
    defaultConditions,
    onDataChange,
    content,
    setting,
    showWait = true,
    showFrequency = true,
    showIfCompleted = true,
    showPriority = true,
    showAtLeast = true,
    disabled = false,
    featureTooltip,
    filterItems,
    showEnabledSwitch = true,
  } = props;

  const [enabled, setEnabled] = useState(defaultEnabled);
  const [conditions, setConditions] = useState<RulesCondition[]>(deepClone(defaultConditions));
  const effectiveEnabled = showEnabledSwitch ? enabled : true;

  // Sync internal state with props when they change
  useEffect(() => {
    setEnabled(defaultEnabled);
  }, [defaultEnabled]);

  useEffect(() => {
    setConditions(deepClone(defaultConditions));
  }, [defaultConditions]);

  const updateSettings = useCallback(
    (updates: Partial<autoStartRulesSetting>) => {
      onDataChange(effectiveEnabled, conditions, { ...setting, ...updates });
    },
    [effectiveEnabled, conditions, setting, onDataChange],
  );

  const handleDataChange = useCallback(
    (conds: RulesCondition[], hasError: boolean) => {
      if (hasError || conditionsIsSame(conds, conditions)) return;

      const newConditions = deepClone(conds);
      setConditions(newConditions);
      onDataChange(effectiveEnabled, newConditions, setting);
    },
    [conditions, effectiveEnabled, setting, onDataChange],
  );

  const handleEnabledChange = useCallback(
    (checked: boolean) => {
      setEnabled(checked);
      onDataChange(checked, conditions, setting);
    },
    [conditions, setting, onDataChange],
  );

  const environmentId = content.environmentId ?? '';
  const contentType = content.type;

  // All hooks must be called before any conditional returns
  const id = useId();
  const { attributeList } = useAttributeListContext();
  const { segmentList } = useSegmentListContext();
  const { eventList } = useEventListContext();
  const { contents } = useContentListQuery({
    query: { environmentId },
    options: { skip: !environmentId },
  });

  if (!environmentId) return null;

  return (
    <div className="space-y-3">
      {showEnabledSwitch && (
        <div className="items-center flex flex-row space-x-1">
          <Switch
            id={id}
            checked={enabled}
            disabled={disabled}
            className="data-[state=unchecked]:bg-input"
            onCheckedChange={handleEnabledChange}
          />
          <Label htmlFor={id} className="max-w-40 truncate font-normal">
            {name}
          </Label>
          <QuestionTooltip className="ml-1" contentClassName="max-w-sm">
            {featureTooltip}
          </QuestionTooltip>
        </div>
      )}
      {(showEnabledSwitch ? enabled : true) && (
        <Rules
          onDataChange={handleDataChange}
          defaultConditions={defaultConditions}
          attributes={attributeList}
          segments={segmentList}
          contents={contents}
          currentContent={content}
          token={getAuthToken()}
          disabled={disabled}
          baseZIndex={WebZIndex.RULES}
          events={eventList}
          {...(filterItems ? { filterItems } : {})}
        />
      )}

      {showWait && (
        <RulesWait
          defaultValue={setting.wait ?? 0}
          onValueChange={(value) => updateSettings({ wait: value })}
          disabled={disabled}
          baseZIndex={WebZIndex.RULES}
        />
      )}
      {showFrequency && (
        <RulesFrequency
          onChange={(frequency) => updateSettings({ frequency })}
          defaultValue={setting.frequency}
          contentType={contentType}
          showAtLeast={showAtLeast}
          disabled={disabled}
        />
      )}
      {showIfCompleted && setting.frequency?.frequency !== Frequency.ONCE && (
        <RulesIfCompleted
          defaultValue={setting.startIfNotComplete ?? false}
          contentType={contentType}
          onCheckedChange={(checked) => updateSettings({ startIfNotComplete: checked })}
          disabled={disabled}
        />
      )}
      {showPriority && (
        <RulesPriority
          onChange={(priority) => updateSettings({ priority: priority as ContentPriority })}
          defaltValue={setting.priority ?? ContentPriority.MEDIUM}
          disabled={disabled}
        />
      )}
    </div>
  );
};

ContentDetailAutoStartRules.displayName = 'ContentDetailAutoStartRules';
