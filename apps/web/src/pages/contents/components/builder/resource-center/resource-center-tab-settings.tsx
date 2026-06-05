'use client';

import {
  Button,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ScrollArea,
} from '@usertour/ui';
import { EXTENSION_SELECT } from '@usertour/constants';
import { RiArrowLeftSLine, SpinnerIcon } from '@usertour/icons';
import { LauncherIconSource } from '@usertour/types';
import { useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBuilderConfig } from '@/pages/contents/components/builder/core';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import { SidebarContainer } from '@/pages/contents/components/builder/components/sidebar';
import { IconPicker } from '@/pages/contents/components/builder/components/icon-picker';
import {
  ContentError,
  ContentErrorAnchor,
  ContentErrorContent,
} from '@/pages/contents/components/builder/components/content-error';

const TabSettingsHeader = () => {
  const { setEditingTab, exitTabSettings } = useResourceCenterEditor();
  const { t } = useTranslation();
  return (
    <CardHeader className="flex-none p-4 space-y-2">
      <CardTitle className="flex flex-row space-x-1 text-base items-center">
        <Button
          variant="link"
          size="icon"
          onClick={() => {
            setEditingTab(null);
            exitTabSettings();
          }}
          className="text-foreground w-6 h-8"
        >
          <RiArrowLeftSLine className="h-6 w-6 opacity-70" />
        </Button>
        <span className="truncate">{t('contentBuilder.resourceCenter.tabSettings')}</span>
      </CardTitle>
    </CardHeader>
  );
};

const TabSettingsBody = () => {
  const { editingTab, setEditingTab, isShowError } = useResourceCenterEditor();
  const { zIndex } = useBuilderConfig();
  const { t } = useTranslation();

  if (!editingTab) {
    return null;
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTab((prev) => (prev ? { ...prev, name: e.target.value } : null));
  };

  const handleIconChange = (updates: {
    iconType?: string;
    iconSource?: LauncherIconSource;
    iconUrl?: string;
  }) => {
    setEditingTab((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ...(updates.iconType !== undefined && { iconType: updates.iconType }),
        ...(updates.iconSource !== undefined && { iconSource: updates.iconSource }),
        ...(updates.iconUrl !== undefined ? { iconUrl: updates.iconUrl } : { iconUrl: undefined }),
      };
    });
  };

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          {/* Name */}
          <ContentError open={isShowError && editingTab.name.trim() === ''}>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="tab-name">{t('contentBuilder.resourceCenter.name')}</Label>
              <ContentErrorAnchor>
                <Input
                  variant="compact-muted"
                  id="tab-name"
                  value={editingTab.name}
                  placeholder={t('contentBuilder.resourceCenter.tabNamePlaceholder')}
                  onChange={handleNameChange}
                />
              </ContentErrorAnchor>
            </div>
            <ContentErrorContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
              {t('contentBuilder.resourceCenter.tabNameRequired')}
            </ContentErrorContent>
          </ContentError>

          {/* Icon */}
          <div className="flex flex-col space-y-2">
            <Label>{t('contentBuilder.resourceCenter.icon')}</Label>
            <IconPicker
              type={editingTab.iconType}
              iconSource={editingTab.iconSource}
              iconUrl={editingTab.iconUrl}
              zIndex={zIndex + EXTENSION_SELECT}
              onChange={handleIconChange}
            />
          </div>
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const TabSettingsFooter = () => {
  const { saveEditingTab, isLoading } = useResourceCenterEditor();
  const { t } = useTranslation();
  return (
    <CardFooter className="flex-none p-5">
      <Button className="w-full h-10" disabled={isLoading} onClick={saveEditingTab}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        {t('contentBuilder.common.save')}
      </Button>
    </CardFooter>
  );
};

export const ResourceCenterTabSettings = () => {
  const { tabId } = useParams();
  const { data, setEditingTab } = useResourceCenterEditor();
  // Seed the editingTab draft from the :tabId route param on mount — covers
  // nav, deep-link and refresh. Shallow clone (settings edits name + icon only).
  useLayoutEffect(() => {
    const tab = data.tabs.find((item) => item.id === tabId);
    setEditingTab(tab ? { ...tab } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);
  return (
    <SidebarContainer>
      <TabSettingsHeader />
      <TabSettingsBody />
      <TabSettingsFooter />
    </SidebarContainer>
  );
};

ResourceCenterTabSettings.displayName = 'ResourceCenterTabSettings';
