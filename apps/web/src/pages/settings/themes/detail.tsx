import { ThemeDetailProvider, useThemeDetailContext } from '@/contexts/theme-detail-context';
import { useMutation } from '@apollo/client';
import { updateTheme } from '@usertour-packages/gql';
import { useToast } from '@usertour-packages/use-toast';
import { getErrorMessage } from '@usertour/helpers';
import type { ThemeTypesSetting, ThemeVariation } from '@usertour/types';
import { useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ThemeBuilder } from './components/theme-builder';
import { ThemeDetailContent } from './components/theme-detail-content';
import { ThemeDetailHeader } from './components/theme-detail-header';
import { ContentLoading } from '@/components/molecules/content-loading';

// Inner component that uses the context
const ThemeDetailInner = () => {
  const { loading, theme, refetch } = useThemeDetailContext();
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [updateMutation] = useMutation(updateTheme);
  const { toast } = useToast();

  const handleSave = useCallback(
    async (payload: { settings: ThemeTypesSetting; variations: ThemeVariation[] }) => {
      if (!theme) return;
      try {
        await updateMutation({
          variables: {
            id: theme.id,
            name: theme.name,
            settings: payload.settings,
            variations: payload.variations,
          },
        });
        await refetch();
      } catch (error) {
        toast({ variant: 'destructive', title: getErrorMessage(error) });
        throw error;
      }
    },
    [theme, updateMutation, refetch, toast],
  );

  if (loading) {
    return <ContentLoading message="Loading theme details..." />;
  }

  if (searchParams.get('builder') === 'v2' && theme) {
    const themesListPath = projectId ? `/project/${projectId}/settings/themes` : null;
    const handleRename = async (name: string) => {
      try {
        await updateMutation({
          variables: {
            id: theme.id,
            name,
            settings: theme.settings,
            variations: theme.variations ?? [],
          },
        });
        await refetch();
      } catch (error) {
        toast({ variant: 'destructive', title: getErrorMessage(error) });
        throw error;
      }
    };
    return (
      <ThemeBuilder
        theme={theme}
        onBack={() => navigate(-1)}
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
  }

  return (
    <div className="hidden flex-col md:flex">
      <ThemeDetailHeader />
      <ThemeDetailContent />
    </div>
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
