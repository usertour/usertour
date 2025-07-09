import { ThemeDetailProvider, useThemeDetailContext } from '@/contexts/theme-detail-context';
import { useParams } from 'react-router-dom';
import { ThemeDetailContent } from './components/theme-detail-content';
import { ThemeDetailHeader } from './components/theme-detail-header';
import { ContentLoading } from '@/components/molecules/content-loading';

// Inner component that uses the context
const ThemeDetailInner = () => {
  const { loading } = useThemeDetailContext();

  if (loading) {
    return <ContentLoading message="Loading theme details..." />;
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
