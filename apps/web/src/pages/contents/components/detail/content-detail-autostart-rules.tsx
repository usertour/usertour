import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
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
  } = props;

  const [enabled, setEnabled] = useState(defaultEnabled);
  const [conditions, setConditions] = useState<RulesCondition[]>(deepClone(defaultConditions));

  // Sync internal state with props when they change
  useEffect(() => {
    setEnabled(defaultEnabled);
  }, [defaultEnabled]);

  useEffect(() => {
    setConditions(deepClone(defaultConditions));
  }, [defaultConditions]);

  const updateSettings = useCallback(
    (updates: Partial<autoStartRulesSetting>) => {
      onDataChange(enabled, conditions, { ...setting, ...updates });
    },
    [enabled, conditions, setting, onDataChange],
  );

  const handleDataChange = useCallback(
    (conds: RulesCondition[], hasError: boolean) => {
      if (hasError || conditionsIsSame(conds, conditions)) return;

      const newConditions = deepClone(conds);
      setConditions(newConditions);
      onDataChange(enabled, newConditions, setting);
    },
    [conditions, enabled, setting, onDataChange],
  );

  const handleEnabledChange = useCallback(
    (checked: boolean) => {
      setEnabled(checked);
      onDataChange(checked, conditions, setting);
    },
    [conditions, setting, onDataChange],
  );

  if (!content.environmentId) return null;

  const id = useId();
  const { attributeList } = useAttributeListContext();
  const { segmentList } = useSegmentListContext();
  const { contents } = useContentListQuery({
    query: { environmentId: content.environmentId },
    options: { skip: !content.environmentId },
  });
  const contentType = content.type;

  return (
    <div className="flex flex-col space-y-8">
      <div className="flex-1 px-4 py-6 space-y-3 grow shadow bg-white rounded-lg">
        <div className="items-center flex flex-row space-x-1">
          <Switch
            id={id}
            checked={enabled}
            disabled={disabled}
            className="data-[state=unchecked]:bg-input"
            onCheckedChange={handleEnabledChange}
          />
          <Label htmlFor={id} className="flex flex-col space-y-1">
            <span className="font-normal">{name}</span>
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <QuestionMarkCircledIcon className="ml-1 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">{featureTooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="space-y-3">
          {enabled && (
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
            />
          )}

          {showWait && (
            <RulesWait
              defaultValue={setting.wait ?? 0}
              onValueChange={(value) => updateSettings({ wait: value })}
              disabled={disabled}
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
      </div>
    </div>
  );
};

ContentDetailAutoStartRules.displayName = 'ContentDetailAutoStartRules';
