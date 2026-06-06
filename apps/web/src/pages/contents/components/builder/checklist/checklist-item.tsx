'use client';

import { BUILDER_Z } from '@usertour/constants';
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
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEnvironmentId, useProjectId } from '@/pages/contents/components/builder/core';
import { useChecklistEditor } from '@/pages/contents/components/builder/checklist/use-checklist-editor';
import { useActionsSaveGate } from '@/pages/contents/components/builder/hooks/use-actions-save-gate';
import { useConditionsSaveGate } from '@/pages/contents/components/builder/hooks/use-conditions-save-gate';
import { useToken } from '@/pages/contents/components/builder/hooks/use-token';
import { SidebarContainer } from '@/pages/contents/components/builder/components/sidebar';

const ChecklistItemHeader = () => {
  const { backToChecklist, setCurrentItem } = useChecklistEditor();
  const { t } = useTranslation();
  return (
    <CardHeader className="flex-none p-4 space-y-2">
      <CardTitle className="flex flex-row space-x-1 text-base items-center">
        <Button
          variant="link"
          size="icon"
          onClick={() => {
            setCurrentItem(null);
            backToChecklist();
          }}
          className="text-foreground w-6 h-8"
        >
          <RiArrowLeftSLine className="h-6 w-6  opacity-70" />
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
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor={`${formPrefix}-name`}>{t('contentBuilder.checklist.itemName')}</Label>
            <Input
              variant="compact-muted"
              id={`${formPrefix}-name`}
              value={currentItem?.name}
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
              id={`${formPrefix}-description`}
              value={currentItem?.description}
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
    <CardFooter className="flex-none p-5">
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
  // Seed the currentItem draft from the :itemId route param when the sub-view
  // mounts — covers nav, deep-link and refresh. Clone so the buffer is an
  // independent draft (edits never mutate currentVersion until save).
  useLayoutEffect(() => {
    const item = data.items.find((it) => it.id === itemId);
    setCurrentItem(item ? (JSON.parse(JSON.stringify(item)) as ChecklistItemType) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);
  return (
    <SidebarContainer>
      <ChecklistItemHeader />
      <ChecklistItemBody />
      <ChecklistItemFooter />
    </SidebarContainer>
  );
};

ChecklistItem.displayName = 'ChecklistItem';
