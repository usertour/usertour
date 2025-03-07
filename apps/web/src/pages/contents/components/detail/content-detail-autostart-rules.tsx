import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Label } from '@usertour-ui/label';
import {
  Rules,
  RulesFrequency,
  RulesIfCompleted,
  RulesPriority,
  RulesWait,
} from '@usertour-ui/shared-components';
import { useContentListQuery } from '@usertour-ui/shared-hooks';
import { getAuthToken } from '@usertour-ui/shared-utils';
import { conditionsIsSame } from '@usertour-ui/shared-utils';
import { Switch } from '@usertour-ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import {
  Content,
  ContentPriority,
  Frequency,
  RulesCondition,
  autoStartRulesSetting,
} from '@usertour-ui/types';
import { useCallback, useId, useState } from 'react';

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
    type,
    showWait = true,
    showFrequency = true,
    showIfCompleted = true,
    showPriority = true,
    showAtLeast = true,
    disabled = false,
  } = props;

  const [enabled, setEnabled] = useState(defaultEnabled);
  const [conditions, setConditions] = useState<RulesCondition[]>(
    JSON.parse(JSON.stringify(defaultConditions)),
  );

  const updateSettings = useCallback(
    (updates: Partial<autoStartRulesSetting>) => {
      onDataChange(enabled, conditions, { ...setting, ...updates });
    },
    [enabled, conditions, setting, onDataChange],
  );

  const handleDataChange = useCallback(
    (conds: RulesCondition[], hasError: boolean) => {
      if (hasError || conditionsIsSame(conds, conditions)) return;

      const newConditions = JSON.parse(JSON.stringify(conds));
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
              <TooltipContent className="max-w-sm">
                {type === ContentDetailAutoStartRulesType.START_RULES && (
                  <>
                    Automatically starts the {contentType} if the user matches the given condition.
                    Example: Automatically start an {contentType} for all new users. <br />
                    <br />
                    Once the {contentType} has started, the auto-start condition has no effect,
                    meaning if the user no longer matches it, the {contentType} will stay open until
                    otherwise dismissed.
                  </>
                )}
                {type === ContentDetailAutoStartRulesType.HIDE_RULES && (
                  <>
                    Temporarily hides the {contentType} when this condition is true. Once the
                    condition is no longer true, the {contentType} may be shown again. <br />
                    Example: Hide a {contentType} on certain pages.
                  </>
                )}
              </TooltipContent>
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
