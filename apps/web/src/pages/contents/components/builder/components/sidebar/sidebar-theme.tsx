'use client';

import { Button, CompactSelect, QuestionTooltip } from '@usertour/ui';
import { RiExternalLinkLine, RiPaletteLine } from '@usertour/icons';
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
          <RiExternalLinkLine className="ml-1 h-4 w-4" />
        </Button>
      </div>
      {currentVersion && (
        <CompactSelect
          icon={<RiPaletteLine />}
          options={(themeList ?? []).map((theme: Theme) => ({
            value: theme.id,
            label: theme.name,
          }))}
          value={currentVersion.themeId}
          onChange={handleThemeChange}
          placeholder="Select"
          className="w-full"
          contentStyle={{ zIndex: zIndex + EXTENSION_SELECT }}
        />
      )}
    </>
  );
};
SidebarTheme.displayName = 'SidebarTheme';
