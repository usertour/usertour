'use client';

import {
  Button,
  CardContent,
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
import { RiAddCircleLine } from '@usertour/icons';
import { EXTENSION_SELECT } from '@usertour/constants';
import { ChecklistCompletionOrder, ChecklistInitialDisplay } from '@usertour/types';
import { uuidV4 } from '@usertour/helpers';
import { useTranslation } from 'react-i18next';
import { useBuilderConfig } from '@/pages/contents/components/builder/core';
import { useSidebarSave } from '@/pages/contents/components/builder/hooks/use-sidebar-save';
import { useChecklistEditor } from '@/pages/contents/components/builder/checklist/use-checklist-editor';
import { BuilderSidebarLayout } from '@/pages/contents/components/builder/components/sidebar/builder-sidebar-layout';
import { SidebarTheme } from '@/pages/contents/components/builder/components/sidebar/sidebar-theme';
import { ChecklistContents } from '@/pages/contents/components/builder/checklist/components/checklist-contents';

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

const ChecklistMainViewBody = () => {
  const { data: localData, addItem, updateData: updateLocalData } = useChecklistEditor();
  const { zIndex } = useBuilderConfig();
  const { t } = useTranslation();

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <SidebarTheme />

          <div className="flex flex-col space-y-2">
            <div className={labelStyles}>
              <Label htmlFor="launcher-button-text">
                {t('contentBuilder.checklist.launcherButtonText')}
              </Label>
            </div>
            <Input
              variant="compact-muted"
              id="launcher-button-text"
              value={localData.buttonText}
              onChange={(e) => updateLocalData({ buttonText: e.target.value })}
              placeholder={t('contentBuilder.checklist.none')}
            />
          </div>

          <ChecklistContents />

          <Button
            className="w-full"
            variant="secondary"
            onClick={() => addItem({ ...defaultItem, id: uuidV4() })}
          >
            <RiAddCircleLine className="mr-2 size-4" />
            {t('contentBuilder.checklist.addItem')}
          </Button>

          <div className={labelStyles}>
            <Label htmlFor="initial-display">{t('contentBuilder.checklist.initialDisplay')}</Label>
            <QuestionTooltip>{t('contentBuilder.checklist.initialDisplayTooltip')}</QuestionTooltip>
          </div>
          <Select
            onValueChange={(value) =>
              updateLocalData({ initialDisplay: value as ChecklistInitialDisplay })
            }
            defaultValue={localData.initialDisplay}
          >
            <SelectTrigger variant="compact-muted">
              <SelectValue placeholder={t('contentBuilder.checklist.selectOption')} />
            </SelectTrigger>
            <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ChecklistInitialDisplay.EXPANDED}>
                    {t('contentBuilder.checklist.expandedChecklist')}
                  </SelectItem>
                  <SelectItem value={ChecklistInitialDisplay.BUTTON}>
                    {t('contentBuilder.checklist.launcherButton')}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </SelectPortal>
          </Select>

          <div className={labelStyles}>
            <Label htmlFor="completion-order">
              {t('contentBuilder.checklist.completionOrder')}
            </Label>
          </div>
          <Select
            onValueChange={(value) =>
              updateLocalData({ completionOrder: value as ChecklistCompletionOrder })
            }
            defaultValue={localData.completionOrder}
          >
            <SelectTrigger variant="compact-muted">
              <SelectValue placeholder={t('contentBuilder.checklist.selectOption')} />
            </SelectTrigger>
            <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ChecklistCompletionOrder.ANY}>
                    {t('contentBuilder.checklist.anyOrder')}
                  </SelectItem>
                  <SelectItem value={ChecklistCompletionOrder.ORDERED}>
                    {t('contentBuilder.checklist.inOrder')}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </SelectPortal>
          </Select>

          <div className={flexBetween}>
            <div className={labelStyles}>
              <Label htmlFor="prevent-dismiss-checklist" className="font-normal">
                {t('contentBuilder.checklist.preventDismissal')}
              </Label>
              <QuestionTooltip>
                {t('contentBuilder.checklist.preventDismissalTooltip')}
              </QuestionTooltip>
            </div>
            <Switch
              id="prevent-dismiss-checklist"
              className="data-[state=unchecked]:bg-input"
              checked={localData.preventDismissChecklist}
              onCheckedChange={(value) => updateLocalData({ preventDismissChecklist: value })}
            />
          </div>

          <div className={flexBetween}>
            <div className={labelStyles}>
              <Label htmlFor="auto-dismiss-checklist" className="font-normal">
                {t('contentBuilder.checklist.autoDismiss')}
              </Label>
              <QuestionTooltip>{t('contentBuilder.checklist.autoDismissTooltip')}</QuestionTooltip>
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

export const ChecklistMainView = () => {
  const handleSave = useSidebarSave();
  return (
    <BuilderSidebarLayout onSave={handleSave}>
      <ChecklistMainViewBody />
    </BuilderSidebarLayout>
  );
};

ChecklistMainView.displayName = 'ChecklistMainView';
