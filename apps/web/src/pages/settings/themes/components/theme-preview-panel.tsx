import { convertSettings, convertToCssVars } from '@/utils/convert-settings';
import { Separator } from '@usertour-ui/separator';
import { cn } from '@usertour-ui/ui-utils';
import {
  LauncherDataType,
  ThemeDetailSelectorType,
  ThemeDetailPreviewType,
} from '@usertour-ui/types';
import { useEffect, useRef, useState } from 'react';
import { useRect } from '@usertour-ui/react-use-rect';
import { useDebouncedCallback } from 'use-debounce';
import { ThemePreviewChecklist } from './preview/theme-preview-checklist';
import { ThemePreviewLauncher } from './preview/theme-preview-launcher';
import { ThemePreviewModal } from './preview/theme-preview-modal';
import { ThemePreviewPopper } from './preview/theme-preview-popper';
import { ThemePreviewSelector } from './preview/theme-preview-selector';
import { ContentEditorRoot, createValue6, surveysValue } from '@usertour-ui/shared-editor';
import { ThemeTypesSetting } from '@usertour-ui/types';

interface ThemePreviewPanelProps {
  settings: ThemeTypesSetting;
  selectedType?: ThemeDetailSelectorType;
  onTypeChange?: (type: ThemeDetailSelectorType) => void;
  onCustomStyleChange?: (style: string) => void;
  showSelector?: boolean;
  customStyle?: string;
  className?: string;
}

export const ThemePreviewPanel = ({
  settings,
  selectedType,
  onTypeChange,
  onCustomStyleChange,
  showSelector = true,
  customStyle,
  className,
}: ThemePreviewPanelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerRect = useRect(containerRef.current);
  const [debouncedRect, setDebouncedRect] = useState<
    { width: number; height: number; x: number; y: number } | undefined
  >();

  // Debounced rect update
  const debouncedSetRect = useDebouncedCallback(
    (rect: { width: number; height: number; x: number; y: number }) => {
      setDebouncedRect(rect);
    },
    100, // 100ms debounce
  );

  // Update debounced rect when container rect changes
  useEffect(() => {
    if (containerRect) {
      const rect = {
        width: containerRect.width,
        height: containerRect.height,
        x: containerRect.left,
        y: containerRect.top,
      };
      debouncedSetRect(rect);
    }
  }, [containerRect, debouncedSetRect]);

  // Generate custom style when settings or selected type changes
  useEffect(() => {
    if (settings && selectedType && onCustomStyleChange) {
      const style = convertToCssVars(convertSettings(settings), selectedType.type);
      onCustomStyleChange(style);
    }
  }, [settings, selectedType, onCustomStyleChange]);

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
          <ThemePreviewPopper
            settings={settings}
            customStyle={customStyle}
            viewRect={debouncedRect}
          />
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
          />
        )}
      </div>
    </div>
  );
};

ThemePreviewPanel.displayName = 'ThemePreviewPanel';
