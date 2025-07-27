import {
  ThemeTypesSetting,
  ThemeDetailSelectorType,
  Attribute,
  ThemeVariation,
} from '@usertour/types';
import { cn } from '@usertour/helpers';
import { ThemeSettingsDefaultPanel } from './theme-settings-panel';
import { ThemePreviewPanel } from './theme-preview-panel';

export interface Rect {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface ThemeEditorProps {
  // Data
  settings: ThemeTypesSetting;
  defaultSettings: ThemeTypesSetting;
  selectedType?: ThemeDetailSelectorType;

  // Callbacks
  onSettingsChange: (settings: ThemeTypesSetting) => void;
  onTypeChange?: (type: ThemeDetailSelectorType) => void;
  onCustomStyleChange?: (style: string) => void;

  // Configuration
  showPreview?: boolean;
  showSelector?: boolean;
  showConditionalVariations?: boolean;
  layout?: 'horizontal' | 'vertical';

  // Styling
  className?: string;

  // Additional data for preview
  customStyle?: string;
  attributeList?: Attribute[];
  variations?: ThemeVariation[];
  onVariationsChange?: (variations: ThemeVariation[]) => void;
}

export const ThemeEditor = ({
  settings,
  defaultSettings,
  selectedType,
  onSettingsChange,
  onTypeChange,
  onCustomStyleChange,
  showPreview = true,
  showSelector = true,
  showConditionalVariations = true,
  layout = 'horizontal',
  className,
  customStyle,
  attributeList,
  variations = [],
  onVariationsChange,
}: ThemeEditorProps) => {
  return (
    <div
      className={cn(
        'flex w-full',
        layout === 'horizontal' ? 'flex-row items-start' : 'flex-col',
        className,
      )}
    >
      <ThemeSettingsDefaultPanel
        settings={settings}
        defaultSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
        attributeList={attributeList}
        variations={variations}
        onVariationsChange={onVariationsChange}
        showConditionalVariations={showConditionalVariations}
      />
      {showPreview && (
        <ThemePreviewPanel
          settings={settings}
          selectedType={selectedType}
          onTypeChange={onTypeChange}
          onCustomStyleChange={onCustomStyleChange}
          showSelector={showSelector}
          customStyle={customStyle}
          className="fixed top-24 right-8 w-[calc(100vw-430px)] h-[calc(100vh-120px)]"
        />
      )}
    </div>
  );
};

ThemeEditor.displayName = 'ThemeEditor';
