import { useGetThemeQuery, useUpdateThemeMutation } from '@usertour/hooks';
import { useToast, ContentLoading } from '@usertour/ui';
import { getErrorMessage } from '@usertour/helpers';
import type { ThemeTypesSetting, ThemeVariation } from '@usertour/types';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { ThemeBuilder } from './components/theme-builder';

export const SettingsThemeDetail = () => {
  const { themeId = '', projectId } = useParams();
  // SHARED_CACHE_QUERY_OPTIONS so this query participates in the
  // normalized cache — without it, the global no-cache default would
  // mean updateTheme's auto-merge into Theme:{id} never reaches this
  // observer, and the builder would render stale fields after a save.
  const { theme, loading } = useGetThemeQuery(themeId, SHARED_CACHE_QUERY_OPTIONS);
  const navigate = useNavigate();
  const { invoke: updateTheme } = useUpdateThemeMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  // updateTheme's response mirrors `listThemes`' selection set, so
  // Apollo's normalized cache auto-merges into the Theme entity — both
  // this detail view (via useGetThemeQuery) and the themes list update
  // without a manual refetch chain.
  const handleSave = useCallback(
    async (payload: { settings: ThemeTypesSetting; variations: ThemeVariation[] }) => {
      if (!theme) return;
      try {
        await updateTheme({
          id: theme.id,
          name: theme.name,
          settings: payload.settings,
          variations: payload.variations,
        });
      } catch (error) {
        toast({ variant: 'destructive', title: getErrorMessage(error) });
        throw error;
      }
    },
    [theme, updateTheme, toast],
  );

  const handleRename = useCallback(
    async (name: string) => {
      if (!theme) return;
      try {
        await updateTheme({
          id: theme.id,
          name,
          settings: theme.settings,
          variations: theme.variations ?? [],
        });
      } catch (error) {
        toast({ variant: 'destructive', title: getErrorMessage(error) });
        throw error;
      }
    },
    [theme, updateTheme, toast],
  );

  if (loading) {
    return <ContentLoading message={t('common.loading')} />;
  }

  if (!theme) {
    return null;
  }

  const themesListPath = projectId ? `/project/${projectId}/settings/themes` : null;

  return (
    <ThemeBuilder
      theme={theme}
      onSave={handleSave}
      onRename={handleRename}
      onActionComplete={(action) => {
        if (action === 'delete' && themesListPath) {
          navigate(themesListPath);
        }
        // Non-delete actions (copy / set-default) flow through wrappers
        // whose refetchQueries / cache.evict already update the
        // relevant slices; no manual refetch needed here.
      }}
    />
  );
};

SettingsThemeDetail.displayName = 'SettingsThemeDetail';
