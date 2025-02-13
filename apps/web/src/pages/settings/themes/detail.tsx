import { ThemeDetailProvider } from '@/contexts/theme-detail-context';
import { useParams } from 'react-router-dom';
import { ThemeDetailContent } from './components/theme-detail-content';
import { ThemeDetailHeader } from './components/theme-detail-header';

export const SettingsThemeDetail = () => {
  const { themeId = '' } = useParams();

  return (
    <>
      <ThemeDetailProvider themeId={themeId}>
        <div className="hidden flex-col md:flex">
          <ThemeDetailHeader />
          <ThemeDetailContent />
        </div>
      </ThemeDetailProvider>
    </>
  );
};

SettingsThemeDetail.displayName = 'SettingsThemeDetail';
