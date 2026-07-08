'use client';

import { BUILDER_Z } from '@usertour/constants';
import { Button, CompactSelect, QuestionTooltip } from '@usertour/ui';
import { RiExternalLinkLine, RiPaletteLine } from '@usertour/icons';
import { useDefaultTheme, useThemeList } from '@/hooks/use-theme-list';
import { Theme } from '@usertour/types';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useBuilderStore, useProjectId } from '@/pages/contents/components/builder/core';

export const SidebarTheme = () => {
  const { themeList } = useThemeList();
  const defaultTheme = useDefaultTheme();
  const { t } = useTranslation();
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const setCurrentVersion = useBuilderStore((state) => state.setCurrentVersion);
  const projectId = useProjectId();

  useEffect(() => {
    if (currentVersion && !currentVersion.themeId && defaultTheme) {
      setCurrentVersion((pre) => (pre ? { ...pre, themeId: defaultTheme.id } : pre));
    }
  }, [currentVersion, defaultTheme]);

  const handleThemeChange = (value: string) => {
    // Write themeId into the draft; the auto-save FSM persists it (themeId is
    // part of the version payload). No standalone mutation, no re-fetch.
    setCurrentVersion((prev) => (prev ? { ...prev, themeId: value } : prev));
  };

  const editThemeUrl = currentVersion
    ? `/project/${projectId}/settings/theme/${currentVersion.themeId}`
    : undefined;

  return (
    <>
      <div className="flex justify-between items-center space-x-1	">
        <div className="flex flex-row justify-between items-center space-x-1 ">
          <h1 className="text-sm">{t('contentBuilder.shared.theme.label')}</h1>
          <QuestionTooltip>{t('contentBuilder.shared.theme.flowTooltip')}</QuestionTooltip>
        </div>

        <Button variant="link" asChild className="p-0 h-full text-sm">
          <a href={editThemeUrl} target="_blank" rel="noopener noreferrer">
            {t('contentBuilder.shared.theme.edit')}
            <RiExternalLinkLine className="ml-1 h-4 w-4 opacity-70" />
          </a>
        </Button>
      </div>
      {currentVersion && (
        <CompactSelect
          icon={<RiPaletteLine className="opacity-70" />}
          options={(themeList ?? []).map((theme: Theme) => ({
            value: theme.id,
            label: theme.name,
          }))}
          value={currentVersion.themeId}
          onChange={handleThemeChange}
          placeholder={t('contentBuilder.shared.theme.selectPlaceholder')}
          className="w-full bg-surface dark:bg-surface-raised/50 shadow-none hover:bg-muted"
          contentStyle={{ zIndex: BUILDER_Z.popover }}
        />
      )}
    </>
  );
};
SidebarTheme.displayName = 'SidebarTheme';
