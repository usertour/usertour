'use client';

import { BUILDER_Z } from '@usertour/constants';
import { cuid } from '@usertour/helpers';
import {
  Button,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ScrollArea,
  Switch,
} from '@usertour/ui';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { RiArrowLeftSLine, SpinnerIcon } from '@usertour/icons';
import { Conditions, DEFAULT_CONDITION_TYPES } from '@usertour/business-components';
import { Actions } from '@usertour/editor';
import { useListEventsQuery, useSegmentListQuery } from '@usertour/hooks';
import {
  ChecklistItemType,
  ContentActionsItemType,
  RulesCondition,
  RulesType,
} from '@usertour/types';
import { useId, useLayoutEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEnvironmentId, useProjectId } from '@/pages/contents/components/builder/core';
import {
  defaultChecklistItem,
  useChecklistEditor,
} from '@/pages/contents/components/builder/checklist/use-checklist-editor';
import { useActionsSaveGate } from '@/pages/contents/components/builder/hooks/use-actions-save-gate';
import { useConditionsSaveGate } from '@/pages/contents/components/builder/hooks/use-conditions-save-gate';
import { useToken } from '@/pages/contents/components/builder/hooks/use-token';
import { FloatingSidebarPanel } from '@/pages/contents/components/builder/components/sidebar';

const ChecklistItemHeader = () => {
  const { backToChecklist, setCurrentItem } = useChecklistEditor();
  const { t } = useTranslation();
  return (
    <CardHeader className="flex-none border-b border-border/50 px-5 py-4">
      <CardTitle className="flex flex-row items-center pr-16 text-base font-semibold">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setCurrentItem(null);
            backToChecklist();
          }}
          className="mr-1.5 size-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RiArrowLeftSLine className="h-5 w-5" />
        </Button>
        <span className="truncate">{t('contentBuilder.checklist.item')}</span>
      </CardTitle>
    </CardHeader>
  );
};

const ChecklistItemBody = () => {
  const { currentItem, setCurrentItem } = useChecklistEditor();
  const { attributeList } = useAttributeList();
  const { contents } = useContentList();
  const environmentId = useEnvironmentId();
  const projectId = useProjectId();
  const formPrefix = useId();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);
  const { t } = useTranslation();

  const handleInputChange =
    (field: keyof ChecklistItemType) => (e: React.ChangeEvent<HTMLInputElement> | boolean) => {
      setCurrentItem((prev) =>
        prev
          ? {
              ...prev,
              [field]: typeof e === 'boolean' ? e : e.target.value,
            }
          : null,
      );
    };

  const handleRulesChange =
    (field: 'clickedActions' | 'completeConditions' | 'onlyShowTaskConditions') =>
    (value: RulesCondition[]) => {
      setCurrentItem((prev) =>
        prev
          ? {
              ...prev,
              [field]: value,
            }
          : null,
      );
    };

  return (
    <CardContent className="grow overflow-hidden p-0">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor={`${formPrefix}-name`}>{t('contentBuilder.checklist.itemName')}</Label>
            <Input
              variant="compact-muted"
              className="bg-surface dark:bg-surface-raised/50 shadow-none"
              id={`${formPrefix}-name`}
              value={currentItem?.name ?? ''}
              placeholder={t('contentBuilder.checklist.none')}
              onChange={handleInputChange('name')}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <Label htmlFor={`${formPrefix}-description`}>
              {t('contentBuilder.checklist.itemDescription')}
            </Label>
            <Input
              variant="compact-muted"
              className="bg-surface dark:bg-surface-raised/50 shadow-none"
              id={`${formPrefix}-description`}
              value={currentItem?.description ?? ''}
              placeholder={t('contentBuilder.checklist.none')}
              onChange={handleInputChange('description')}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <Label>{t('contentBuilder.checklist.whenClicked')}</Label>
            <Actions
              baseZIndex={BUILDER_Z.popover}
              currentStep={undefined}
              filterItems={[
                ContentActionsItemType.CHECKLIST_DISMIS,
                ContentActionsItemType.FLOW_START,
                ContentActionsItemType.PAGE_NAVIGATE,
                ContentActionsItemType.JAVASCRIPT_EVALUATE,
              ]}
              currentVersion={undefined}
              onChange={handleRulesChange('clickedActions')}
              conditions={currentItem?.clickedActions ?? []}
              attributes={attributeList}
              contents={contents}
              token={token}
              t={t}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <Label>{t('contentBuilder.checklist.markCompleted')}</Label>
            <Conditions
              onChange={handleRulesChange('completeConditions')}
              conditions={currentItem?.completeConditions ?? []}
              filterItems={[...DEFAULT_CONDITION_TYPES, RulesType.TASK_IS_CLICKED]}
              attributes={attributeList}
              contents={contents}
              segments={segmentList}
              events={eventList}
              token={token}
              baseZIndex={BUILDER_Z.rules}
              t={t}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="checklist-item-only-show-task" className="font-normal">
                {t('contentBuilder.checklist.onlyShowTask')}
              </Label>
              <Switch
                id="checklist-item-only-show-task"
                className="data-[state=unchecked]:bg-input"
                checked={currentItem?.onlyShowTask}
                onCheckedChange={handleInputChange('onlyShowTask')}
              />
            </div>
            {currentItem?.onlyShowTask && (
              <Conditions
                onChange={handleRulesChange('onlyShowTaskConditions')}
                conditions={currentItem?.onlyShowTaskConditions ?? []}
                attributes={attributeList}
                contents={contents}
                segments={segmentList}
                events={eventList}
                token={token}
                baseZIndex={BUILDER_Z.rules}
                t={t}
              />
            )}
          </div>
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const ChecklistItemFooter = () => {
  const { saveCurrentItem, currentItem, isLoading } = useChecklistEditor();
  const { t } = useTranslation();
  const conditionsGate = useConditionsSaveGate();
  const actionsGate = useActionsSaveGate();
  const handleSave = () => {
    // Conditions and actions are validated by different schema registries —
    // routing actions through the conditions gate (as the v1 wiring did)
    // silently no-ops because no condition schema matches an action type.
    if (!conditionsGate(currentItem?.completeConditions, currentItem?.onlyShowTaskConditions)) {
      return;
    }
    if (!actionsGate(currentItem?.clickedActions)) {
      return;
    }
    saveCurrentItem();
  };
  return (
    <CardFooter className="flex-none border-t border-border/50 p-4">
      <Button className="w-full h-10" disabled={isLoading} onClick={handleSave}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        {t('contentBuilder.common.save')}
      </Button>
    </CardFooter>
  );
};

export const ChecklistItem = () => {
  const { itemId } = useParams();
  const { data, setCurrentItem } = useChecklistEditor();
  const existing = itemId ? data.items.find((it) => it.id === itemId) : undefined;
  // Seed the currentItem draft from the route when the sub-view mounts (covers
  // nav, deep-link and refresh):
  //   item/new       → a fresh default draft (lands in the array only on save)
  //   item/:itemId   → a clone of the existing item
  // Clone so the buffer is independent — edits never mutate currentVersion
  // until save.
  useLayoutEffect(() => {
    if (!itemId) {
      setCurrentItem({ ...defaultChecklistItem, id: cuid() } as ChecklistItemType);
      return;
    }
    setCurrentItem(existing ? (JSON.parse(JSON.stringify(existing)) as ChecklistItemType) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);
  // Deleted / stale item id — bounce back to the checklist instead of a blank
  // editor.
  if (itemId && !existing) {
    return <Navigate to=".." replace />;
  }
  return (
    <FloatingSidebarPanel width={320}>
      <ChecklistItemHeader />
      <ChecklistItemBody />
      <ChecklistItemFooter />
    </FloatingSidebarPanel>
  );
};

ChecklistItem.displayName = 'ChecklistItem';
