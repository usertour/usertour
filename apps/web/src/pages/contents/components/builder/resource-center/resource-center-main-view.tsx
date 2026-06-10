'use client';

import { BUILDER_Z } from '@usertour/constants';
import { RiAddCircleLine } from '@usertour/icons';
import {
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  ScrollArea,
  Button,
} from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { useSidebarSave } from '@/pages/contents/components/builder/hooks/use-sidebar-save';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import { BuilderSidebarLayout } from '@/pages/contents/components/builder/components/sidebar/builder-sidebar-layout';
import { SidebarTheme } from '@/pages/contents/components/builder/components/sidebar/sidebar-theme';
import { ResourceCenterBlocks } from '@/pages/contents/components/builder/resource-center/components/resource-center-blocks';
import { ResourceCenterTabs } from '@/pages/contents/components/builder/resource-center/components/resource-center-tabs';
import { BLOCK_TYPE_OPTIONS } from '@/pages/contents/components/builder/resource-center/resource-center-block-options';
const labelStyles = 'flex justify-start items-center space-x-1';

const ResourceCenterMainViewBody = () => {
  const {
    data: localData,
    startCreateBlock,
    updateData: updateLocalData,
    currentTabId,
  } = useResourceCenterEditor();
  const { t } = useTranslation();

  const currentTab = localData.tabs.find((tab) => tab.id === currentTabId);

  return (
    <CardContent className="grow overflow-hidden p-0">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <SidebarTheme />

          {/* Header Text */}
          <div className="flex flex-col space-y-2">
            <div className={labelStyles}>
              <Label htmlFor="header-text">{t('contentBuilder.resourceCenter.headerText')}</Label>
            </div>
            <Input
              variant="compact-muted"
              className="bg-surface dark:bg-surface-raised/50 shadow-none"
              id="header-text"
              value={localData.headerText}
              onChange={(e) => {
                updateLocalData({ headerText: e.target.value });
              }}
              placeholder={t('contentBuilder.resourceCenter.headerTextPlaceholder')}
            />
          </div>

          {/* Launcher Button Text */}
          <div className="flex flex-col space-y-2">
            <div className={labelStyles}>
              <Label htmlFor="launcher-button-text">
                {t('contentBuilder.resourceCenter.launcherButtonText')}
              </Label>
            </div>
            <Input
              variant="compact-muted"
              className="bg-surface dark:bg-surface-raised/50 shadow-none"
              id="launcher-button-text"
              value={localData.buttonText}
              onChange={(e) => {
                updateLocalData({ buttonText: e.target.value });
              }}
              placeholder={t('contentBuilder.resourceCenter.none')}
            />
          </div>

          <ResourceCenterTabs />

          {currentTab && (
            <>
              <ResourceCenterBlocks />

              {/* Add Block */}
              <div>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-9 w-full rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:bg-accent/50 hover:text-primary"
                    >
                      <RiAddCircleLine className="mr-2 size-4 opacity-70" />
                      {t('contentBuilder.resourceCenter.addBlock')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={6}
                    className="min-w-[280px]"
                    style={{ zIndex: BUILDER_Z.popover }}
                  >
                    {BLOCK_TYPE_OPTIONS.map(
                      ({ key, value, label, description, icon: Icon, disabled }) => {
                        return (
                          <DropdownMenuItem
                            key={key}
                            disabled={disabled}
                            className="cursor-pointer min-w-[220px] gap-2 py-1.5 text-xs"
                            onSelect={() => value && startCreateBlock(value)}
                          >
                            <Icon
                              width={16}
                              height={16}
                              className="shrink-0 text-foreground opacity-70"
                            />
                            <span className="min-w-0 leading-none">
                              <span className="text-xs font-medium text-foreground">
                                {t(label)}
                              </span>
                              <span className="ml-1 text-xs text-muted-foreground">
                                {t(description)}
                              </span>
                            </span>
                          </DropdownMenuItem>
                        );
                      },
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </CardContent>
  );
};

export const ResourceCenterMainView = () => {
  const handleSave = useSidebarSave();
  return (
    <BuilderSidebarLayout onSave={handleSave}>
      <ResourceCenterMainViewBody />
    </BuilderSidebarLayout>
  );
};

ResourceCenterMainView.displayName = 'ResourceCenterMainView';
