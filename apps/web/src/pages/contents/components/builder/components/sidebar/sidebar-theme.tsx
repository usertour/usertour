'use client';

import { CubeIcon, OpenInNewWindowIcon } from '@radix-ui/react-icons';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
  QuestionTooltip,
} from '@usertour/ui';
import { EXTENSION_SELECT } from '@usertour/constants';
import { useThemeList } from '@/hooks/use-theme-list';
import { Theme } from '@usertour/types';
import { useCallback, useEffect } from 'react';

import {
  useBuilderConfig,
  useBuilderStore,
  useProjectId,
} from '@/pages/contents/components/builder/core';

export const SidebarTheme = () => {
  const { themeList } = useThemeList();
  const { zIndex } = useBuilderConfig();
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const setCurrentVersion = useBuilderStore((state) => state.setCurrentVersion);
  const projectId = useProjectId();

  useEffect(() => {
    if (currentVersion && !currentVersion.themeId && themeList) {
      const defaultThemeId = themeList.find((item) => item.isDefault === true);
      if (defaultThemeId) {
        setCurrentVersion((pre) => (pre ? { ...pre, themeId: defaultThemeId.id } : pre));
      }
    }
  }, [currentVersion, themeList]);

  const handleThemeChange = (value: string) => {
    // Write themeId into the draft; the auto-save FSM persists it (themeId is
    // part of the version payload). No standalone mutation, no re-fetch.
    setCurrentVersion((prev) => (prev ? { ...prev, themeId: value } : prev));
  };

  const handleEditTheme = useCallback(() => {
    if (!currentVersion) {
      return;
    }
    const url = `/project/${projectId}/settings/theme/${currentVersion.themeId}`;
    window.open(url, '_blank');
  }, [currentVersion]);

  return (
    <>
      <div className="flex justify-between items-center space-x-1	">
        <div className="flex flex-row justify-between items-center space-x-1 ">
          <h1 className="text-sm">Theme</h1>
          <QuestionTooltip>
            This is the flow theme that will be used by default in every step
          </QuestionTooltip>
        </div>

        <Button variant="link" onClick={handleEditTheme} className="p-0 h-full	text-sm	">
          Edit this theme
          <OpenInNewWindowIcon className="ml-1" />
        </Button>
      </div>
      {currentVersion && (
        <Select
          defaultValue={currentVersion.themeId}
          onValueChange={handleThemeChange}
          value={currentVersion.themeId}
        >
          <SelectTrigger className="justify-start flex h-8 text-xs	">
            <CubeIcon className="flex-none mr-2" />
            <div className="grow text-left">
              <SelectValue placeholder="Select" />
            </div>
          </SelectTrigger>

          <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
            <SelectContent>
              {themeList?.map((theme: Theme) => (
                <SelectItem value={theme.id} key={theme.id} className="text-xs">
                  {theme.name}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectPortal>
        </Select>
      )}
    </>
  );
};
SidebarTheme.displayName = 'SidebarTheme';
