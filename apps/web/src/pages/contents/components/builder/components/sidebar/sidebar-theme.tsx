'use client';

import { BUILDER_Z } from '@usertour/constants';
import { Button, CompactSelect, QuestionTooltip } from '@usertour/ui';
import { RiExternalLinkLine, RiPaletteLine } from '@usertour/icons';
import { useThemeList } from '@/hooks/use-theme-list';
import { Theme } from '@usertour/types';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useBuilderStore, useProjectId } from '@/pages/contents/components/builder/core';

export const SidebarTheme = () => {
  const { themeList } = useThemeList();
  const { t } = useTranslation();
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
          <h1 className="text-sm">{t('contentBuilder.shared.theme.label')}</h1>
          <QuestionTooltip>{t('contentBuilder.shared.theme.flowTooltip')}</QuestionTooltip>
        </div>

        <Button variant="link" onClick={handleEditTheme} className="p-0 h-full text-sm">
          {t('contentBuilder.shared.theme.edit')}
          <RiExternalLinkLine className="ml-1 h-4 w-4 opacity-70" />
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
          className="w-full bg-slate-50 shadow-none hover:bg-slate-100"
          contentStyle={{ zIndex: BUILDER_Z.popover }}
        />
      )}
    </>
  );
};
SidebarTheme.displayName = 'SidebarTheme';
