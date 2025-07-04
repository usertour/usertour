'use client';

import { ChevronLeftIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import { CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-ui/card';
import { EXTENSION_SELECT, RulesType } from '@usertour-ui/constants';
import { useAttributeListContext, useContentListContext } from '@usertour-ui/contexts';
import { SpinnerIcon } from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
import { Label } from '@usertour-ui/label';
import { ScrollArea } from '@usertour-ui/scroll-area';
import { Rules } from '@usertour-ui/shared-components';
import { defaultRulesItems } from '@usertour-ui/shared-components';
import { ContentActions } from '@usertour-ui/shared-editor';
import { useSegmentListQuery } from '@usertour-ui/shared-hooks';
import { Switch } from '@usertour-ui/switch';
import { ChecklistItemType, ContentActionsItemType, RulesCondition } from '@usertour-ui/types';
import { useId } from 'react';
import { BuilderMode, useBuilderContext, useChecklistContext } from '../../contexts';
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
  const { environmentId } = useBuilderContext();
  const formPrefix = useId();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
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
            <ContentActions
              zIndex={zIndex + EXTENSION_SELECT}
              isShowIf={false}
              isShowLogic={false}
              currentStep={undefined}
              filterItems={[
                ContentActionsItemType.CHECKLIST_DISMIS,
                ContentActionsItemType.FLOW_START,
                ContentActionsItemType.PAGE_NAVIGATE,
                ContentActionsItemType.JAVASCRIPT_EVALUATE,
              ]}
              currentVersion={undefined}
              onDataChange={handleRulesChange('clickedActions')}
              defaultConditions={currentItem?.clickedActions ?? []}
              attributes={attributeList}
              contents={contents}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <Label>Mark completed</Label>
            <Rules
              onDataChange={handleRulesChange('completeConditions')}
              defaultConditions={currentItem?.completeConditions ?? []}
              filterItems={[...defaultRulesItems, RulesType.TASK_IS_CLICKED]}
              attributes={attributeList}
              contents={contents}
              segments={segmentList}
              token={token}
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
              <Rules
                onDataChange={handleRulesChange('onlyShowTaskConditions')}
                defaultConditions={currentItem?.onlyShowTaskConditions ?? []}
                attributes={attributeList}
                contents={contents}
                segments={segmentList}
                token={token}
              />
            )}
          </div>
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const ChecklistItemFooter = () => {
  const { saveCurrentItem, isLoading } = useChecklistContext();
  return (
    <CardFooter className="flex-none p-5">
      <Button className="w-full h-10" disabled={isLoading} onClick={saveCurrentItem}>
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
