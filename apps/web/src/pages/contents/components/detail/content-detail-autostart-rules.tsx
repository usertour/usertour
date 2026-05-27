import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useEventListContext } from '@/contexts/event-list-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { WebZIndex } from '@usertour/constants';
import { Label } from '@usertour/ui';
import { cn } from '@usertour/tailwind';
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
import isEqual from 'fast-deep-equal';
import { Switch } from '@usertour/ui';
import { QuestionTooltip } from '@usertour/ui';
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

// Coerce the persisted enabled flag so the server never sees `enabled=true`
// paired with an empty conditions list — the runtime can't act on a rule
// with nothing to match. The local toggle still reflects user intent so the
// Conditions panel and empty-state card stay visible until the user adds a
// condition or flips the toggle off.
const coerceEnabledForPersist = (flag: boolean, conds: RulesCondition[]) =>
  flag && conds.length > 0;

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
  // Local mirror of the `setting` prop. Without this, visibility gates
  // and sibling defaultValues lag the user's edit by debounce + mutation
  // + refetch (~1s) — e.g. switching Frequency from Once to Multiple
  // would leave "Only start if not complete" hidden until the new
  // setting trickles back through Apollo.
  const [localSetting, setLocalSetting] = useState(setting);
  // The setting value we last observed from the parent. settings.tsx
  // recomputes `config = buildConfig(version.config)` on every render
  // and buildConfig's deepmerge produces a fresh `autoStartRulesSetting`
  // reference each time — so the `setting` prop reference flips on
  // every parent render (including the setIsSaving toggles emitted
  // during our own debounced save, while version.config still holds
  // the pre-edit value). A reference-only sync would then clobber the
  // user's optimistic localSetting with the stale prop and visibly
  // flash the picker back to its prior state. Compare by value: skip
  // the sync when only the reference changed.
  const lastObservedSettingRef = useRef(setting);
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

  useEffect(() => {
    if (isEqual(setting, lastObservedSettingRef.current)) return;
    lastObservedSettingRef.current = setting;
    setLocalSetting(setting);
  }, [setting]);

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
      // Empty conditions = incomplete rule. Gate sibling writes so a stray
      // dropdown click on a half-finished rule doesn't push that state
      // onto the wire.
      if (committedConditionsRef.current.length === 0) return;
      const merged = { ...setting, ...updates };
      // Reflect the change in local state immediately so visibility
      // gates and sibling defaults respond to the user's edit without
      // waiting for the parent's round-trip.
      setLocalSetting(merged);
      onDataChange(
        coerceEnabledForPersist(effectiveEnabled, committedConditionsRef.current),
        committedConditionsRef.current,
        merged,
      );
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
      // Always propagate validated changes — including transitions to
      // empty. The parent decides whether to save or cancel any pending
      // debounced save, because the "don't autosave empty conditions"
      // policy needs to also clear a queued save from a prior non-empty
      // edit, which autostart-rules can't reach from here.
      onDataChange(coerceEnabledForPersist(effectiveEnabled, cloned), cloned, setting);
    },
    [attributeList, contents, effectiveEnabled, eventList, onDataChange, segmentList, setting],
  );

  const handleEnabledChange = useCallback(
    (checked: boolean) => {
      setEnabled(checked);
      const coerced = coerceEnabledForPersist(checked, committedConditionsRef.current);
      // Skip when coercion matches the server's current state — turning
      // the toggle on/off with no conditions would otherwise round-trip
      // a no-op write (and fork the version if it happens to be
      // published).
      if (coerced === defaultEnabled) return;
      onDataChange(coerced, committedConditionsRef.current, setting);
    },
    [defaultEnabled, setting, onDataChange],
  );

  // Rule is conceptually "on" but no conditions yet — surface an inline
  // empty-state so the user sees "won't activate until you add one"
  // right where they need to act. Gated on `effectiveEnabled` (not
  // `enabled`) so this also fires for consumers without a toggle
  // (tracker editor passes showEnabledSwitch=false; the rule is then
  // implicitly always-on and an empty conditions list is the same
  // "incomplete setup" situation).
  const showEmptyState = effectiveEnabled && conditions.length === 0 && !disabled;

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
      {effectiveEnabled && (
        <div
          className={cn(
            'flex flex-col gap-2',
            showEmptyState && 'rounded-md bg-muted/30 px-4 py-3',
          )}
        >
          {showEmptyState && (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground/90">
                {t('contents.detail.rules.emptyConditionsTitle')}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('contents.detail.rules.emptyConditionsHint')}
              </span>
            </div>
          )}
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
        </div>
      )}

      {/* Sibling settings render only while the rule is on AND has at
          least one condition. Off-state hides them along with the
          conditions list; empty-state hides them because their writes
          would never reach the wire (gated above in updateSettings). */}
      {effectiveEnabled && !showEmptyState && (
        <>
          {showWait && (
            <ConditionWait
              defaultValue={localSetting.wait ?? 0}
              onValueChange={(value) => updateSettings({ wait: value })}
              disabled={disabled}
              t={t}
            />
          )}
          {showFrequency && (
            <ConditionFrequency
              onChange={(frequency) => updateSettings({ frequency })}
              defaultValue={localSetting.frequency}
              contentType={contentType}
              showAtLeast={showAtLeast}
              disabled={disabled}
              t={t}
            />
          )}
          {showIfCompleted && localSetting.frequency?.frequency !== Frequency.ONCE && (
            <ConditionIfCompleted
              defaultValue={localSetting.startIfNotComplete ?? false}
              contentType={contentType}
              onCheckedChange={(checked) => updateSettings({ startIfNotComplete: checked })}
              disabled={disabled}
              t={t}
            />
          )}
          {showPriority && (
            <ConditionPriority
              onChange={(priority) => updateSettings({ priority: priority as ContentPriority })}
              defaultValue={localSetting.priority ?? ContentPriority.MEDIUM}
              disabled={disabled}
              t={t}
            />
          )}
        </>
      )}
    </div>
  );
};

ContentDetailAutoStartRules.displayName = 'ContentDetailAutoStartRules';
