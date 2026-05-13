'use client';

import { ChevronLeftIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour/button';
import { CardContent, CardFooter, CardHeader, CardTitle } from '@usertour/card';
import { EXTENSION_CONTENT_RULES, EXTENSION_SELECT } from '@usertour/constants';
import { useAttributeListContext, useContentListContext } from '@usertour/contexts';
import { SpinnerIcon } from '@usertour/icons';
import { Input } from '@usertour/input';
import { Label } from '@usertour/label';
import { ScrollArea } from '@usertour/scroll-area';
import { Conditions, DEFAULT_CONDITION_TYPES } from '@usertour/business-components';
import { Actions } from '@usertour/editor';
import { useListEventsQuery, useSegmentListQuery } from '@usertour/hooks';
import { Switch } from '@usertour/switch';
import {
  ChecklistItemType,
  ContentActionsItemType,
  RulesCondition,
  RulesType,
} from '@usertour/types';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { BuilderMode, useBuilderContext, useChecklistContext } from '../../contexts';
import { useActionsSaveGate } from '../../hooks/use-actions-save-gate';
import { useConditionsSaveGate } from '../../hooks/use-conditions-save-gate';
import { useToken } from '../../hooks/use-token';
import { SidebarContainer } from '../sidebar';

const ChecklistItemHeader = () => {
  const { setCurrentMode } = useBuilderContext();
  const { setCurrentItem } = useChecklistContext();
  return (
    <CardHeader className="flex-none p-4 space-y-2">
      <CardTitle className="flex flex-row space-x-1 text-base items-center">
        <Button
          variant="link"
          size="icon"
          onClick={() => {
            setCurrentItem(null);
            setCurrentMode({ mode: BuilderMode.CHECKLIST });
          }}
          className="text-foreground w-6 h-8"
        >
          <ChevronLeftIcon className="h-6 w-6 " />
        </Button>
        <span className=" truncate ...">Checklist Item</span>
      </CardTitle>
    </CardHeader>
  );
};

const ChecklistItemBody = () => {
  const { currentItem, setCurrentItem, zIndex } = useChecklistContext();
  const { attributeList } = useAttributeListContext();
  const { contents } = useContentListContext();
  const { environmentId, projectId } = useBuilderContext();
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
            <Label htmlFor={`${formPrefix}-name`}>Name</Label>
            <Input
              id={`${formPrefix}-name`}
              className="bg-background-900"
              value={currentItem?.name}
              placeholder="None"
              onChange={handleInputChange('name')}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <div className="flex justify-start items-center space-x-1	">
              <Label htmlFor={`${formPrefix}-description`}>Optional text below task name</Label>
            </div>
            <Input
              id={`${formPrefix}-description`}
              className="bg-background-900"
              value={currentItem?.description}
              placeholder="None"
              onChange={handleInputChange('description')}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <Label>When task is clicked</Label>
            <Actions
              baseZIndex={zIndex + EXTENSION_SELECT}
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
            <Label>Mark completed</Label>
            <Conditions
              onChange={handleRulesChange('completeConditions')}
              conditions={currentItem?.completeConditions ?? []}
              filterItems={[...DEFAULT_CONDITION_TYPES, RulesType.TASK_IS_CLICKED]}
              attributes={attributeList}
              contents={contents}
              segments={segmentList}
              events={eventList}
              token={token}
              baseZIndex={EXTENSION_CONTENT_RULES}
              t={t}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor={'dddd'} className="font-normal">
                Only show task
              </Label>
              <Switch
                id={'dddd'}
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
                baseZIndex={EXTENSION_CONTENT_RULES}
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
  const { saveCurrentItem, currentItem, isLoading } = useChecklistContext();
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
        Save
      </Button>
    </CardFooter>
  );
};

export const ChecklistItem = () => {
  return (
    <SidebarContainer>
      <ChecklistItemHeader />
      <ChecklistItemBody />
      <ChecklistItemFooter />
    </SidebarContainer>
  );
};

ChecklistItem.displayName = 'ChecklistItem';
