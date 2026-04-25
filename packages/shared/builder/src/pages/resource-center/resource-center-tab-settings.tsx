'use client';

import { ChevronLeftIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { EXTENSION_SELECT } from '@usertour-packages/constants';
import { SpinnerIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { LauncherIconSource } from '@usertour/types';
import { BuilderMode, useBuilderContext, useResourceCenterContext } from '../../contexts';
import { SidebarContainer } from '../sidebar';
import { IconPicker } from '../../components/icon-picker';
import {
  ContentError,
  ContentErrorAnchor,
  ContentErrorContent,
} from '../../components/content-error';

const TabSettingsHeader = () => {
  const { setCurrentMode } = useBuilderContext();
  const { setEditingTab } = useResourceCenterContext();
  return (
    <CardHeader className="flex-none p-4 space-y-2">
      <CardTitle className="flex flex-row space-x-1 text-base items-center">
        <Button
          variant="link"
          size="icon"
          onClick={() => {
            setEditingTab(null);
            setCurrentMode({ mode: BuilderMode.RESOURCE_CENTER });
          }}
          className="text-foreground w-6 h-8"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </Button>
        <span className="truncate">Tab settings</span>
      </CardTitle>
    </CardHeader>
  );
};

const TabSettingsBody = () => {
  const { editingTab, setEditingTab, zIndex, isShowError } = useResourceCenterContext();

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
              <Label htmlFor="tab-name">Name</Label>
              <ContentErrorAnchor>
                <Input
                  id="tab-name"
                  className="bg-background-900"
                  value={editingTab.name}
                  placeholder="Tab name"
                  onChange={handleNameChange}
                />
              </ContentErrorAnchor>
            </div>
            <ContentErrorContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
              Tab name is required
            </ContentErrorContent>
          </ContentError>

          {/* Icon */}
          <div className="flex flex-col space-y-2">
            <Label>Icon</Label>
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
  const { saveEditingTab, isLoading } = useResourceCenterContext();
  return (
    <CardFooter className="flex-none p-5">
      <Button className="w-full h-10" disabled={isLoading} onClick={saveEditingTab}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        Save
      </Button>
    </CardFooter>
  );
};

export const ResourceCenterTabSettings = () => {
  return (
    <SidebarContainer>
      <TabSettingsHeader />
      <TabSettingsBody />
      <TabSettingsFooter />
    </SidebarContainer>
  );
};

ResourceCenterTabSettings.displayName = 'ResourceCenterTabSettings';
