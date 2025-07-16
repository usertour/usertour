import { useThemeDetailContext } from '@/contexts/theme-detail-context';
import { defaultSettings } from '@usertour-ui/types';
import { deepmerge } from 'deepmerge-ts';
import { ThemeEditor } from './theme-editor';

export const ThemeDetailContent = () => {
  const {
    settings,
    setSettings,
    selectedType,
    setSelectedType,
    setCustomStyle,
    setViewRect,
    theme,
    customStyle,
    viewRect,
  } = useThemeDetailContext();

  return (
    <div className="flex flex-row pt-24 px-8">
      <ThemeEditor
        settings={settings || deepmerge(defaultSettings, theme.settings)}
        defaultSettings={deepmerge(defaultSettings, theme.settings)}
        selectedType={selectedType}
        onSettingsChange={setSettings}
        onTypeChange={setSelectedType}
        onCustomStyleChange={setCustomStyle}
        onViewRectChange={setViewRect}
        showPreview={true}
        showSelector={true}
        layout="horizontal"
        customStyle={customStyle}
        viewRect={viewRect}
        theme={theme}
      />
    </div>
  );
};

ThemeDetailContent.displayName = 'ThemeDetailContent';
