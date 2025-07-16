import { convertSettings, convertToCssVars } from '@/utils/convert-settings';
import { useSize } from '@usertour-ui/react-use-size';
import { Separator } from '@usertour-ui/separator';
import { cn } from '@usertour-ui/ui-utils';
import {
  LauncherDataType,
  ThemeDetailSelectorType,
  ThemeDetailPreviewType,
} from '@usertour-ui/types';
import { useEffect, useRef } from 'react';
import { ThemePreviewChecklist } from './preview/theme-preview-checklist';
import { ThemePreviewLauncher } from './preview/theme-preview-launcher';
import { ThemePreviewModal } from './preview/theme-preview-modal';
import { ThemePreviewPopper } from './preview/theme-preview-popper';
import { ThemePreviewSelector } from './preview/theme-preview-selector';
import { ContentEditorRoot, createValue6, surveysValue } from '@usertour-ui/shared-editor';
import { ThemeTypesSetting } from '@usertour-ui/types';
import { Rect } from './theme-editor';

interface ThemePreviewPanelProps {
  settings: ThemeTypesSetting;
  selectedType?: ThemeDetailSelectorType;
  onTypeChange?: (type: ThemeDetailSelectorType) => void;
  onCustomStyleChange?: (style: string) => void;
  onViewRectChange?: (rect: Rect) => void;
  showSelector?: boolean;
  customStyle?: string;
  viewRect?: Rect;
  className?: string;
}

export const ThemePreviewPanel = ({
  settings,
  selectedType,
  onTypeChange,
  onCustomStyleChange,
  onViewRectChange,
  showSelector = true,
  customStyle,
  viewRect,
  className,
}: ThemePreviewPanelProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerRectSize = useSize(containerRef.current);

  // Generate custom style when settings or selected type changes
  useEffect(() => {
    if (settings && selectedType && onCustomStyleChange) {
      const style = convertToCssVars(convertSettings(settings), selectedType.type);
      onCustomStyleChange(style);
    }
  }, [settings, selectedType, onCustomStyleChange]);

  // Update view rect when container size changes
  useEffect(() => {
    if (containerRef.current && onViewRectChange) {
      const { width, height, x, y } = containerRef.current.getBoundingClientRect();
      onViewRectChange({ width, height, x, y });
    }
  }, [containerRef, containerRectSize, onViewRectChange]);

  return (
    <div className={cn('shadow bg-white rounded-lg grow ml-4 h-full flex flex-col', className)}>
      <div className="flex flex-col items-start justify-between space-y-2 p-4 sm:flex-row sm:items-center sm:space-y-0 md:h-16">
        <h2 className="text-lg font-semibold">Preview</h2>
        {showSelector && (
          <div className="ml-auto flex w-full space-x-2 sm:justify-end">
            <ThemePreviewSelector selectedType={selectedType} onTypeChange={onTypeChange} />
          </div>
        )}
      </div>
      <Separator />
      <div className="bg-blue-50 flex-1 overflow-hidden" ref={containerRef}>
        {selectedType?.type === ThemeDetailPreviewType.TOOLTIP && (
          <ThemePreviewPopper settings={settings} customStyle={customStyle} viewRect={viewRect} />
        )}
        {selectedType?.type === ThemeDetailPreviewType.MODAL && (
          <ThemePreviewModal
            contents={createValue6 as ContentEditorRoot[]}
            settings={settings}
            customStyle={customStyle}
          />
        )}
        {selectedType?.type === ThemeDetailPreviewType.NPS && (
          <ThemePreviewModal
            contents={surveysValue as ContentEditorRoot[]}
            settings={settings}
            customStyle={customStyle}
          />
        )}
        {selectedType?.type === ThemeDetailPreviewType.LAUNCHER_ICON && (
          <ThemePreviewLauncher type={LauncherDataType.ICON} settings={settings} />
        )}
        {selectedType?.type === ThemeDetailPreviewType.LAUNCHER_BEACON && (
          <ThemePreviewLauncher type={LauncherDataType.BEACON} settings={settings} />
        )}
        {(selectedType?.type === ThemeDetailPreviewType.CHECKLIST ||
          selectedType?.type === ThemeDetailPreviewType.CHECKLIST_LAUNCHER) && (
          <ThemePreviewChecklist
            expanded={selectedType.type === ThemeDetailPreviewType.CHECKLIST}
            settings={settings}
            containerHeight={containerRectSize?.height}
          />
        )}
      </div>
    </div>
  );
};

ThemePreviewPanel.displayName = 'ThemePreviewPanel';
