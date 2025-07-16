import { useThemeDetailContext } from '@/contexts/theme-detail-context';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { defaultSettings } from '@usertour-ui/types';
import { deepmerge } from 'deepmerge-ts';
import { ThemeEditor } from './theme-editor';

export const ThemeDetailContent = () => {
  const {
    settings,
    setSettings,
    variations,
    setVariations,
    selectedType,
    setSelectedType,
    setCustomStyle,
    setViewRect,
    theme,
    customStyle,
    viewRect,
  } = useThemeDetailContext();
  const { attributeList } = useAttributeListContext();

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
        attributeList={attributeList}
        variations={variations}
        onVariationsChange={setVariations}
      />
    </div>
  );
};

ThemeDetailContent.displayName = 'ThemeDetailContent';
