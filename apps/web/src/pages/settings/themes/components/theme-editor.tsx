import {
  ThemeTypesSetting,
  ThemeDetailSelectorType,
  Attribute,
  ThemeVariation,
} from '@usertour-ui/types';
import { cn } from '@usertour-ui/ui-utils';
import { ThemeSettingsPanel } from './theme-settings-panel';
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
  onViewRectChange?: (rect: Rect) => void;

  // Configuration
  showPreview?: boolean;
  showSelector?: boolean;
  layout?: 'horizontal' | 'vertical';

  // Styling
  className?: string;

  // Additional data for preview
  customStyle?: string;
  viewRect?: Rect;
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
  onViewRectChange,
  showPreview = true,
  showSelector = true,
  layout = 'horizontal',
  className,
  customStyle,
  viewRect,
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
      <ThemeSettingsPanel
        settings={settings}
        defaultSettings={defaultSettings}
        onSettingsChange={onSettingsChange}
        attributeList={attributeList}
        variations={variations}
        onVariationsChange={onVariationsChange}
      />
      {showPreview && (
        <ThemePreviewPanel
          settings={settings}
          selectedType={selectedType}
          onTypeChange={onTypeChange}
          onCustomStyleChange={onCustomStyleChange}
          onViewRectChange={onViewRectChange}
          showSelector={showSelector}
          customStyle={customStyle}
          viewRect={viewRect}
          className="h-[calc(100vh-120px)]"
        />
      )}
    </div>
  );
};

ThemeEditor.displayName = 'ThemeEditor';
