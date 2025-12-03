import { useThemeDetailContext } from '@/contexts/theme-detail-context';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { defaultSettings } from '@usertour/types';
import { deepmerge } from 'deepmerge-ts';
import { ThemeEditor } from './theme-editor';
import { useAppContext } from '@/contexts/app-context';
import { ContentLoading } from '@/components/molecules/content-loading';

export const ThemeDetailContent = () => {
  const {
    settings,
    setSettings,
    variations,
    setVariations,
    selectedType,
    setSelectedType,
    setCustomStyle,
    theme,
    customStyle,
  } = useThemeDetailContext();
  const { attributeList } = useAttributeListContext();
  const { isViewOnly } = useAppContext();

  if (!theme) {
    return <ContentLoading message="Loading theme details..." />;
  }

  const showConditionalVariations = !theme.isSystem;

  return (
    <div className="flex flex-row pt-24 px-8">
      <ThemeEditor
        settings={settings || deepmerge(defaultSettings, theme.settings)}
        defaultSettings={deepmerge(defaultSettings, theme.settings)}
        selectedType={selectedType}
        onSettingsChange={setSettings}
        onTypeChange={setSelectedType}
        onCustomStyleChange={setCustomStyle}
        showPreview={true}
        showSelector={true}
        layout="horizontal"
        showConditionalVariations={showConditionalVariations}
        customStyle={customStyle}
        attributeList={attributeList}
        variations={variations}
        onVariationsChange={setVariations}
        isViewOnly={isViewOnly}
      />
    </div>
  );
};

ThemeDetailContent.displayName = 'ThemeDetailContent';
