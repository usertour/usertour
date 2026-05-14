import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useEventListContext } from '@/contexts/event-list-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { WebZIndex } from '@usertour/constants';
import { Label } from '@usertour/label';
import {
  ConditionFrequency,
  ConditionIfCompleted,
  ConditionPriority,
  ConditionWait,
  Conditions,
  validateConditions,
} from '@usertour/business-components';
import { useContentListQuery } from '@usertour/hooks';
import { deepClone, getAuthToken } from '@usertour/helpers';
import { conditionsIsSame } from '@usertour/helpers';
import { Switch } from '@usertour/switch';
import { QuestionTooltip } from '@usertour/tooltip';
import {
  Content,
  ContentPriority,
  Frequency,
  RulesCondition,
  autoStartRulesSetting,
} from '@usertour/types';
import { useCallback, useId, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

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
  // The latest validated conditions. Sibling settings (wait / frequency /
  // priority / enabled toggle) call onDataChange with this snapshot rather
  // than the displayed `conditions` so an in-flight invalid edit can't
  // piggy-back into the persisted payload via an unrelated control.
  const committedConditionsRef = useRef<RulesCondition[]>(deepClone(defaultConditions));
  const effectiveEnabled = showEnabledSwitch ? enabled : true;
  const { t } = useTranslation();

  // Sync internal state with props when they change
  useEffect(() => {
    setEnabled(defaultEnabled);
  }, [defaultEnabled]);

  useEffect(() => {
    const cloned = deepClone(defaultConditions);
    setConditions(cloned);
    committedConditionsRef.current = cloned;
  }, [defaultConditions]);

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

  const updateSettings = useCallback(
    (updates: Partial<autoStartRulesSetting>) => {
      onDataChange(effectiveEnabled, committedConditionsRef.current, { ...setting, ...updates });
    },
    [effectiveEnabled, setting, onDataChange],
  );

  const handleConditionsChange = useCallback(
    (conds: RulesCondition[]) => {
      // Mirror v1 behavior: only propagate to the parent when conditions are
      // both new and valid — partial input keeps the controlled value
      // up-to-date locally without overwriting the persisted state above.
      setConditions(conds);
      const failures = validateConditions(conds, {
        attributes: attributeList,
        segments: segmentList,
        contents,
        events: eventList,
      });
      if (failures.length > 0) return;
      if (conditionsIsSame(conds, committedConditionsRef.current)) return;
      const cloned = deepClone(conds);
      committedConditionsRef.current = cloned;
      onDataChange(effectiveEnabled, cloned, setting);
    },
    [attributeList, contents, effectiveEnabled, eventList, onDataChange, segmentList, setting],
  );

  const handleEnabledChange = useCallback(
    (checked: boolean) => {
      setEnabled(checked);
      onDataChange(checked, committedConditionsRef.current, setting);
    },
    [setting, onDataChange],
  );

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
        <Conditions
          conditions={conditions}
          onChange={handleConditionsChange}
          attributes={attributeList}
          segments={segmentList}
          contents={contents}
          currentContent={content}
          token={getAuthToken()}
          disabled={disabled}
          baseZIndex={WebZIndex.RULES}
          events={eventList}
          t={t}
          {...(filterItems ? { filterItems } : {})}
        />
      )}

      {showWait && (
        <ConditionWait
          defaultValue={setting.wait ?? 0}
          onValueChange={(value) => updateSettings({ wait: value })}
          disabled={disabled}
          t={t}
        />
      )}
      {showFrequency && (
        <ConditionFrequency
          onChange={(frequency) => updateSettings({ frequency })}
          defaultValue={setting.frequency}
          contentType={contentType}
          showAtLeast={showAtLeast}
          disabled={disabled}
          t={t}
        />
      )}
      {showIfCompleted && setting.frequency?.frequency !== Frequency.ONCE && (
        <ConditionIfCompleted
          defaultValue={setting.startIfNotComplete ?? false}
          contentType={contentType}
          onCheckedChange={(checked) => updateSettings({ startIfNotComplete: checked })}
          disabled={disabled}
          t={t}
        />
      )}
      {showPriority && (
        <ConditionPriority
          onChange={(priority) => updateSettings({ priority: priority as ContentPriority })}
          defaultValue={setting.priority ?? ContentPriority.MEDIUM}
          disabled={disabled}
          t={t}
        />
      )}
    </div>
  );
};

ContentDetailAutoStartRules.displayName = 'ContentDetailAutoStartRules';
