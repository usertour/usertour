import { useThemeDetailContext } from '@/contexts/theme-detail-context';
import { convertSettings, convertToCssVars } from '@/utils/convert-settings';
import { useSize } from '@usertour-ui/react-use-size';
import { Separator } from '@usertour-ui/separator';
import { LauncherDataType } from '@usertour-ui/types';
import { useEffect, useRef } from 'react';
import { ThemePreviewChecklist } from './preview/theme-preview-checklist';
import { ThemePreviewLauncher } from './preview/theme-preview-launcher';
import { ThemePreviewModal } from './preview/theme-preview-modal';
import { ThemePreviewPopper } from './preview/theme-preview-popper';
import { ThemePreviewSelector } from './preview/theme-preview-selector';
import { createValue6, surveysValue } from '@usertour-ui/shared-editor';

export const ThemeDetailPreview = () => {
  const { settings, setCustomStyle, setViewRect, selectedType } = useThemeDetailContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerRectSize = useSize(containerRef.current);
  useEffect(() => {
    if (settings) {
      const style = convertToCssVars(convertSettings(settings), selectedType.type);
      setCustomStyle(style);
    }
  }, [settings, selectedType.type]);

  useEffect(() => {
    if (containerRef.current) {
      const { width, height, x, y } = containerRef.current.getBoundingClientRect();
      setViewRect({ width, height, x, y });
    }
  }, [containerRef, containerRectSize]);

  return (
    <div className="shadow bg-white rounded-lg fixed h-[calc(100vh_-_196px)] top-24 left-[400px] w-[calc(100vw_-_420px)]">
      <div className="flex flex-col items-start justify-between space-y-2 p-4 sm:flex-row sm:items-center sm:space-y-0 md:h-16">
        <h2 className="text-lg font-semibold">Preview</h2>
        <div className="ml-auto flex w-full space-x-2 sm:justify-end">
          <ThemePreviewSelector />
        </div>
      </div>
      <Separator />
      <div className=" bg-blue-50 h-full overflow-hidden" ref={containerRef}>
        {selectedType.type === 'tooltip' && <ThemePreviewPopper />}
        {selectedType.type === 'modal' && <ThemePreviewModal contents={createValue6 as any} />}
        {selectedType.type === 'nps' && <ThemePreviewModal contents={surveysValue as any} />}
        {selectedType.type === 'launcher-icon' && (
          <ThemePreviewLauncher type={LauncherDataType.ICON} />
        )}
        {selectedType.type === 'launcher-beacon' && (
          <ThemePreviewLauncher type={LauncherDataType.BEACON} />
        )}
        {selectedType.type === 'checklist' && <ThemePreviewChecklist />}
        {selectedType.type === 'checklist-launcher' && <ThemePreviewChecklist open={false} />}
      </div>
    </div>
  );
};

ThemeDetailPreview.displayName = 'ThemeDetailPreview';
