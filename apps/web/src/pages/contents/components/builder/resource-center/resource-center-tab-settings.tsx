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
} from '@usertour/ui';
import { RiArrowLeftSLine, SpinnerIcon } from '@usertour/icons';
import { LauncherIconSource } from '@usertour/types';
import { uuidV4 } from '@usertour/helpers';
import { useLayoutEffect } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import { FloatingSidebarPanel } from '@/pages/contents/components/builder/components/sidebar';
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
    <CardHeader className="flex-none border-b border-border/50 px-5 py-4">
      <CardTitle className="flex flex-row space-x-1 text-base font-semibold items-center pr-16">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setEditingTab(null);
            exitTabSettings();
          }}
          className="mr-1.5 size-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RiArrowLeftSLine className="h-5 w-5" />
        </Button>
        <span className="truncate">{t('contentBuilder.resourceCenter.tabSettings')}</span>
      </CardTitle>
    </CardHeader>
  );
};

const TabSettingsBody = () => {
  const { editingTab, setEditingTab, isShowError } = useResourceCenterEditor();
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
    <CardContent className="grow overflow-hidden p-0">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          {/* Name */}
          <ContentError open={isShowError && editingTab.name.trim() === ''}>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="tab-name">{t('contentBuilder.resourceCenter.name')}</Label>
              <ContentErrorAnchor>
                <Input
                  variant="compact-muted"
                  className="bg-surface dark:bg-surface-raised/50 shadow-none"
                  id="tab-name"
                  value={editingTab.name}
                  placeholder={t('contentBuilder.resourceCenter.tabNamePlaceholder')}
                  onChange={handleNameChange}
                />
              </ContentErrorAnchor>
            </div>
            <ContentErrorContent style={{ zIndex: BUILDER_Z.popover }}>
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
              zIndex={BUILDER_Z.popover}
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
    <CardFooter className="flex-none border-t border-border/50 p-4">
      <Button className="w-full h-10" disabled={isLoading} onClick={saveEditingTab}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        {t('contentBuilder.common.save')}
      </Button>
    </CardFooter>
  );
};

export const ResourceCenterTabSettings = () => {
  const { tabId } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('new') === '1';
  const { data, setEditingTab } = useResourceCenterEditor();
  const existing = data.tabs.find((item) => item.id === tabId);
  // Seed the editingTab draft on mount (covers nav, deep-link and refresh):
  //   ?new=1   → a fresh default tab (lands + switches to it on save)
  //   tab/:id  → a shallow clone of the existing tab (settings edits name + icon)
  useLayoutEffect(() => {
    if (isNew) {
      setEditingTab({
        id: uuidV4(),
        name: '',
        iconSource: LauncherIconSource.BUILTIN,
        iconType: 'home-line',
        blocks: [],
      });
      return;
    }
    setEditingTab(existing ? { ...existing } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId, isNew]);
  // Stale tab id (deleted / bad deep-link) — bounce back instead of a blank page.
  if (!isNew && !existing) {
    return <Navigate to=".." relative="path" replace />;
  }
  return (
    <FloatingSidebarPanel width={320}>
      <TabSettingsHeader />
      <TabSettingsBody />
      <TabSettingsFooter />
    </FloatingSidebarPanel>
  );
};

ResourceCenterTabSettings.displayName = 'ResourceCenterTabSettings';
