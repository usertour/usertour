'use client';

import { BUILDER_Z } from '@usertour/constants';
import { Button, CardContent, Input, Label, ScrollArea } from '@usertour/ui';
import { RiAddCircleLine } from '@usertour/icons';
import { ChecklistCompletionOrder, ChecklistInitialDisplay } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useSidebarSave } from '@/pages/contents/components/builder/hooks/use-sidebar-save';
import { useChecklistEditor } from '@/pages/contents/components/builder/checklist/use-checklist-editor';
import { BuilderSidebarLayout } from '@/pages/contents/components/builder/components/sidebar/builder-sidebar-layout';
import { SidebarTheme } from '@/pages/contents/components/builder/components/sidebar/sidebar-theme';
import { ChecklistContents } from '@/pages/contents/components/builder/checklist/components/checklist-contents';
import {
  BooleanField,
  SelectField,
  SettingsCard,
} from '@/pages/contents/components/builder/shared/fields';

const labelStyles = 'flex justify-start items-center space-x-1';

const ChecklistMainViewBody = () => {
  const { data: localData, startCreateItem, updateData: updateLocalData } = useChecklistEditor();
  const { t } = useTranslation();

  return (
    <CardContent className="grow overflow-hidden p-0">
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
              className="bg-surface shadow-none"
              id="launcher-button-text"
              value={localData.buttonText}
              onChange={(e) => updateLocalData({ buttonText: e.target.value })}
              placeholder={t('contentBuilder.checklist.none')}
            />
          </div>

          <ChecklistContents />

          <Button
            variant="ghost"
            onClick={startCreateItem}
            className="h-9 w-full rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:bg-accent/50 hover:text-primary"
          >
            <RiAddCircleLine className="mr-2 size-4 opacity-70" />
            {t('contentBuilder.checklist.addItem')}
          </Button>

          <SettingsCard title={t('contentBuilder.checklist.settings')}>
            <SelectField
              label={t('contentBuilder.checklist.initialDisplay')}
              tooltip={t('contentBuilder.checklist.initialDisplayTooltip')}
              value={localData.initialDisplay}
              onChange={(value) =>
                updateLocalData({ initialDisplay: value as ChecklistInitialDisplay })
              }
              options={[
                {
                  value: ChecklistInitialDisplay.EXPANDED,
                  label: t('contentBuilder.checklist.expandedChecklist'),
                },
                {
                  value: ChecklistInitialDisplay.BUTTON,
                  label: t('contentBuilder.checklist.launcherButton'),
                },
              ]}
              placeholder={t('contentBuilder.checklist.selectOption')}
              zIndex={BUILDER_Z.popover}
            />
            <SelectField
              label={t('contentBuilder.checklist.completionOrder')}
              value={localData.completionOrder}
              onChange={(value) =>
                updateLocalData({ completionOrder: value as ChecklistCompletionOrder })
              }
              options={[
                {
                  value: ChecklistCompletionOrder.ANY,
                  label: t('contentBuilder.checklist.anyOrder'),
                },
                {
                  value: ChecklistCompletionOrder.ORDERED,
                  label: t('contentBuilder.checklist.inOrder'),
                },
              ]}
              placeholder={t('contentBuilder.checklist.selectOption')}
              zIndex={BUILDER_Z.popover}
            />
            <BooleanField
              label={t('contentBuilder.checklist.preventDismissal')}
              tooltip={t('contentBuilder.checklist.preventDismissalTooltip')}
              checked={localData.preventDismissChecklist}
              onChange={(value) => updateLocalData({ preventDismissChecklist: value })}
            />
            <BooleanField
              label={t('contentBuilder.checklist.autoDismiss')}
              tooltip={t('contentBuilder.checklist.autoDismissTooltip')}
              checked={localData.autoDismissChecklist}
              onChange={(value) => updateLocalData({ autoDismissChecklist: value })}
            />
          </SettingsCard>
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
