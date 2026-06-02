import { Button, Label } from '@usertour/ui';
import { EXTENSION_CONTENT_RULES, EXTENSION_SELECT } from '@usertour/constants';
import { Delete2Icon } from '@usertour/icons';
import {
  ConditionWait,
  Conditions,
  DEFAULT_CONDITION_TYPES,
  validateConditions,
} from '@usertour/business-components';
import { Actions, validateActions } from '@usertour/editor';
import { Attribute, Content, ContentVersion, RulesCondition, Step } from '@usertour/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ContentError,
  ContentErrorAnchor,
  ContentErrorContent,
} from '@/pages/contents/components/builder/core/components/content-error';

interface ContentTriggerProps {
  actions: RulesCondition[];
  conditions: RulesCondition[];
  attributeList: Attribute[] | undefined;
  currentVersion: ContentVersion | undefined;
  currentContent: Content | undefined;
  zIndex: number;
  contents: Content[];
  currentStep: Step;
  token: string;
  showError: boolean;
  wait: number;
  onActionsChange: (actions: RulesCondition[], hasError: boolean) => void;
  onConditonsChange: (conds: RulesCondition[], hasError: boolean) => void;
  onDelete: () => void;
  createStep?: (currentVersion: ContentVersion, sequence: number) => Promise<Step | undefined>;
  onRulesConditionElementChange?: (conditionIndex: number, type: string) => void;
  onWaitChange: (wait: number) => void;
}

export const ContentTrigger = (props: ContentTriggerProps) => {
  const {
    actions,
    attributeList,
    currentVersion,
    zIndex,
    contents,
    conditions,
    token,
    onActionsChange,
    onConditonsChange,
    currentStep,
    createStep,
    onDelete,
    currentContent,
    showError,
    onRulesConditionElementChange,
    onWaitChange,
    wait,
  } = props;
  const { t } = useTranslation();

  // v2 Conditions is controlled (parent owns the displayed value) — v1 Rules
  // managed its own state. The trigger's parent only writes back valid
  // payloads, so without a local buffer a freshly-added (initially-invalid)
  // condition would round-trip to nothing and disappear from the UI. Mirror
  // v1's "always show what the user picked" by holding a local copy that
  // syncs with the prop on the way in but updates immediately on every
  // change on the way out.
  const [localConditions, setLocalConditions] = useState<RulesCondition[]>(conditions);
  // Same controlled-buffer trick as conditions: parent only writes back
  // valid payloads, so the local copy is what the chip row renders while
  // the user edits a draft.
  const [localActions, setLocalActions] = useState<RulesCondition[]>(actions);

  useEffect(() => {
    setLocalConditions(conditions);
  }, [conditions]);

  useEffect(() => {
    setLocalActions(actions);
  }, [actions]);

  const handleConditionsChange = useCallback(
    (conds: RulesCondition[]) => {
      setLocalConditions(conds);
      const failures = validateConditions(conds, {
        attributes: attributeList,
        contents,
      });
      onConditonsChange(conds, failures.length > 0);
    },
    [attributeList, contents, onConditonsChange],
  );

  const handleActionsChange = useCallback(
    (next: RulesCondition[]) => {
      setLocalActions(next);
      const failures = validateActions(next, {
        attributes: attributeList,
        contents,
        currentVersion,
        currentStep,
      });
      onActionsChange(next, failures.length > 0);
    },
    [attributeList, contents, currentVersion, currentStep, onActionsChange],
  );

  // Live recomputation of "is some action incomplete?" — used to decide
  // whether the trigger card lights up red. Without this, the outer card
  // only flagged empty conditions/actions; an incomplete action chip lit
  // up red on its own but the surrounding card looked fine, leaving Save
  // (which silently blocks on incomplete actions) appearing dead.
  const hasIncompleteActions = useMemo(() => {
    if (localActions.length === 0) return false;
    return (
      validateActions(localActions, {
        attributes: attributeList,
        contents,
        currentVersion,
        currentStep,
      }).length > 0
    );
  }, [localActions, attributeList, contents, currentVersion, currentStep]);

  return (
    <>
      <div className="flex flex-col border shadow p-2 rounded-lg space-y-4 relative">
        <ContentError
          open={
            showError && (actions.length === 0 || conditions.length === 0 || hasIncompleteActions)
          }
        >
          <ContentErrorAnchor>
            <Conditions
              conditions={localConditions}
              onChange={handleConditionsChange}
              attributes={attributeList}
              contents={contents}
              currentContent={currentContent}
              token={token}
              filterItems={DEFAULT_CONDITION_TYPES.filter(
                (item) => item !== 'segment' && item !== 'content' && item !== 'event',
              )}
              onElementChange={onRulesConditionElementChange}
              baseZIndex={EXTENSION_CONTENT_RULES}
              t={t}
            />
            <ConditionWait
              defaultValue={wait}
              onValueChange={onWaitChange}
              disabled={false}
              t={t}
            />
            <Label>Action to perform when triggered</Label>
            <Actions
              baseZIndex={zIndex + EXTENSION_SELECT}
              currentStep={currentStep}
              currentVersion={currentVersion}
              conditions={localActions}
              onChange={handleActionsChange}
              attributes={attributeList}
              contents={contents}
              createStep={createStep}
              token={token}
              t={t}
            />
          </ContentErrorAnchor>
          <ContentErrorContent
            style={{
              zIndex: EXTENSION_CONTENT_RULES,
            }}
          >
            {conditions.length === 0 && t('actions.errors.trigger.emptyConditions')}
            {conditions.length > 0 &&
              actions.length === 0 &&
              t('actions.errors.trigger.emptyActions')}
            {conditions.length > 0 &&
              actions.length > 0 &&
              hasIncompleteActions &&
              t('actions.errors.trigger.incompleteActions')}
          </ContentErrorContent>
        </ContentError>
        <Button
          className="flex-none hover:bg-destructive/20 absolute right-1 bottom-1 text-destructive hover:text-destructive"
          variant="ghost"
          size={'sm'}
          onClick={onDelete}
        >
          <Delete2Icon className="text-destructive mr-1 size-3.5	" />
          Delete trigger
        </Button>
      </div>
    </>
  );
};
ContentTrigger.displayName = 'ContentTrigger';
