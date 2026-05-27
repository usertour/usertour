import { ThemeDetailProvider, useThemeDetailContext } from '@/contexts/theme-detail-context';
import { useUpdateThemeMutation } from '@usertour/hooks';
import { useToast, ContentLoading } from '@usertour/ui';
import { getErrorMessage } from '@usertour/helpers';
import type { ThemeTypesSetting, ThemeVariation } from '@usertour/types';
import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeBuilder } from './components/theme-builder';

// Inner component that uses the context
const ThemeDetailInner = () => {
  const { loading, theme, refetch } = useThemeDetailContext();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { invoke: updateTheme } = useUpdateThemeMutation();
  const { toast } = useToast();

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
        await refetch();
      } catch (error) {
        toast({ variant: 'destructive', title: getErrorMessage(error) });
        throw error;
      }
    },
    [theme, updateTheme, refetch, toast],
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
        await refetch();
      } catch (error) {
        toast({ variant: 'destructive', title: getErrorMessage(error) });
        throw error;
      }
    },
    [theme, updateTheme, refetch, toast],
  );

  if (loading) {
    return <ContentLoading message="Loading theme details..." />;
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
        if (action === 'delete') {
          if (themesListPath) navigate(themesListPath);
        } else {
          refetch();
        }
      }}
    />
  );
};

export const SettingsThemeDetail = () => {
  const { themeId = '' } = useParams();

  return (
    <ThemeDetailProvider themeId={themeId}>
      <ThemeDetailInner />
    </ThemeDetailProvider>
  );
};

SettingsThemeDetail.displayName = 'SettingsThemeDetail';
