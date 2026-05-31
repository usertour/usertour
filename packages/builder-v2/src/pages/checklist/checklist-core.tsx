'use client';

import { PlusCircledIcon } from '@radix-ui/react-icons';
import {
  Button,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  QuestionTooltip,
  ScrollArea,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@usertour/ui';
import { EXTENSION_SELECT } from '@usertour/constants';
import { ChecklistCompletionOrder, ChecklistInitialDisplay } from '@usertour/types';
import { uuidV4 } from '@usertour/helpers';
import { useBuilderConfig, useBuilderMethods, useBuilderStore } from '../../contexts';
import { useChecklistEditor } from './use-checklist-editor';
import { SidebarContainer } from '../sidebar';
import { SidebarFooter } from '../sidebar/sidebar-footer';
import { SidebarHeader } from '../sidebar/sidebar-header';
import { SidebarTheme } from '../sidebar/sidebar-theme';
import { ChecklistContents } from './components/checklist-contents';

// Common styles
const flexBetween = 'flex items-center justify-between space-x-2';
const labelStyles = 'flex justify-start items-center space-x-1';

const defaultItem = {
  name: 'New Item',
  description: 'New Item Description',
  clickedActions: [],
  isCompleted: false,
  completeConditions: [],
  onlyShowTask: false,
  onlyShowTaskConditions: [],
};

const ChecklistCoreBody = () => {
  const { data: localData, addItem, updateData: updateLocalData } = useChecklistEditor();
  const { zIndex } = useBuilderConfig();

  if (!localData) {
    return null;
  }

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <SidebarTheme />

          {/* Launcher Button Text */}
          <div className="flex flex-col space-y-2">
            <div className={labelStyles}>
              <Label htmlFor="launcher-button-text">Launcher button text</Label>
            </div>
            <Input
              className="bg-background-900"
              id="launcher-button-text"
              value={localData.buttonText}
              onChange={(e) => {
                updateLocalData({ buttonText: e.target.value });
              }}
              placeholder="None"
            />
          </div>

          <ChecklistContents />

          {/* Add Item Button */}
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => addItem({ ...defaultItem, id: uuidV4() })}
          >
            <PlusCircledIcon className="mr-2" />
            Add item
          </Button>

          {/* Initial Display Select */}
          <div className={labelStyles}>
            <Label htmlFor="initial-display">Initially show as</Label>
            <QuestionTooltip>
              Whether to show the whole checklist (including its tasks) or just the launcher button
              when the checklist starts.
            </QuestionTooltip>
          </div>
          <Select
            onValueChange={(value) =>
              updateLocalData({
                initialDisplay: value as ChecklistInitialDisplay,
              })
            }
            defaultValue={localData.initialDisplay}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a option" />
            </SelectTrigger>
            <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ChecklistInitialDisplay.EXPANDED}>
                    Expanded checklist
                  </SelectItem>
                  <SelectItem value={ChecklistInitialDisplay.BUTTON}>Launcher button</SelectItem>
                </SelectGroup>
              </SelectContent>
            </SelectPortal>
          </Select>

          {/* Task Completion Order Select */}
          <div className={labelStyles}>
            <Label htmlFor="completion-order">Task completion order</Label>
          </div>
          <Select
            onValueChange={(value) =>
              updateLocalData({
                completionOrder: value as ChecklistCompletionOrder,
              })
            }
            defaultValue={localData.completionOrder}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a option" />
            </SelectTrigger>
            <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ChecklistCompletionOrder.ANY}>In any order</SelectItem>
                  <SelectItem value={ChecklistCompletionOrder.ORDERED}>In order</SelectItem>
                </SelectGroup>
              </SelectContent>
            </SelectPortal>
          </Select>

          {/* Prevent Dismiss Checklist Switch */}
          <div className={flexBetween}>
            <div className={labelStyles}>
              <Label htmlFor="prevent-dismiss-checklist" className="font-normal">
                Prevent dismissal
              </Label>
              <QuestionTooltip>Prevent users from dismissing the checklist.</QuestionTooltip>
            </div>
            <Switch
              id="prevent-dismiss-checklist"
              className="data-[state=unchecked]:bg-input"
              checked={localData.preventDismissChecklist}
              onCheckedChange={(value) => updateLocalData({ preventDismissChecklist: value })}
            />
          </div>

          {/* Auto-dismiss Checklist Switch */}
          <div className={flexBetween}>
            <div className={labelStyles}>
              <Label htmlFor="auto-dismiss-checklist" className="font-normal">
                Auto-dismiss checklist
              </Label>
              <QuestionTooltip>
                Automatically dismiss the checklist when all tasks are completed.
              </QuestionTooltip>
            </div>
            <Switch
              id="auto-dismiss-checklist"
              className="data-[state=unchecked]:bg-input"
              checked={localData.autoDismissChecklist}
              onCheckedChange={(value) => updateLocalData({ autoDismissChecklist: value })}
            />
          </div>
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const ChecklistCoreHeader = () => {
  const currentContent = useBuilderStore((state) => state.currentContent);
  return (
    <CardHeader className="flex-none p-4 space-y-3">
      <CardTitle className="flex h-8">
        <SidebarHeader title={currentContent?.name ?? ''} />
      </CardTitle>
    </CardHeader>
  );
};

const ChecklistCoreFooter = () => {
  // isLoading merges initial-content load + save-in-flight (legacy
  // overload). Per docs/conventions/builder-context-migration.md.
  const isLoading = useBuilderStore(
    (state) => state.isLoading || state.saveState.status === 'saving',
  );
  const { onSaved } = useBuilderConfig();
  const { saveContent } = useBuilderMethods();

  const handleSave = async () => {
    await saveContent();
    await onSaved?.();
  };

  return (
    <CardFooter className="flex p-5">
      <SidebarFooter onSave={handleSave} isLoading={isLoading} />
    </CardFooter>
  );
};

export const ChecklistCore = () => {
  return (
    <SidebarContainer>
      <ChecklistCoreHeader />
      <ChecklistCoreBody />
      <ChecklistCoreFooter />
    </SidebarContainer>
  );
};

ChecklistCore.displayName = 'ChecklistCore';
