import { convertSettings, convertToCssVars } from '@/utils/convert-settings';
import { useRect } from '@usertour/react-use-rect';
import { LauncherDataType, ThemeDetailPreviewType, type ThemeTypesSetting } from '@usertour/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import {
  BANNER_PREVIEW_CONTENT,
  BUBBLE_PREVIEW_CONTENT,
  MODAL_PREVIEW_CONTENT,
  NPS_PREVIEW_CONTENT,
  TOOLTIP_PREVIEW_CONTENT,
} from '../../../constants/preview-contents';
import { ThemePreviewBubble } from '../../preview/theme-preview-bubble';
import { ThemePreviewChecklist } from '../../preview/theme-preview-checklist';
import { ThemePreviewLauncher } from '../../preview/theme-preview-launcher';
import { ThemePreviewModal } from '../../preview/theme-preview-modal';
import { ThemePreviewPopper } from '../../preview/theme-preview-popper';
import { ThemePreviewResourceCenter } from '../../preview/theme-preview-resource-center';
import type { Rect } from '../../preview/types';
import { WidgetSwitcher } from '../top-bar/widget-switcher';
import { BannerPreview } from './banner-preview';
import { BrowserFrame } from './browser-frame';

interface Props {
  settings: ThemeTypesSetting;
  widgetType: ThemeDetailPreviewType;
  onWidgetTypeChange: (next: ThemeDetailPreviewType) => void;
}

export function PreviewPane({ settings, widgetType, onWidgetTypeChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerRect = useRect(containerRef.current);
  const [debouncedRect, setDebouncedRect] = useState<Rect | undefined>();

  const debouncedSetRect = useDebouncedCallback((rect: Rect) => setDebouncedRect(rect), 100);

  useEffect(() => {
    if (containerRect) debouncedSetRect(containerRect);
  }, [containerRect, debouncedSetRect]);

  const customStyle = useMemo(
    () => convertToCssVars(convertSettings(settings), widgetType),
    [settings, widgetType],
  );

  return (
    <div className="flex flex-1 items-center justify-center overflow-hidden bg-muted p-8">
      <BrowserFrame
        ref={containerRef}
        chromeAction={<WidgetSwitcher value={widgetType} onChange={onWidgetTypeChange} />}
      >
        {widgetType === ThemeDetailPreviewType.TOOLTIP && (
          <ThemePreviewPopper
            contents={TOOLTIP_PREVIEW_CONTENT}
            settings={settings}
            customStyle={customStyle}
            viewRect={debouncedRect}
          />
        )}
        {widgetType === ThemeDetailPreviewType.MODAL && (
          <ThemePreviewModal
            contents={MODAL_PREVIEW_CONTENT}
            settings={settings}
            customStyle={customStyle}
          />
        )}
        {widgetType === ThemeDetailPreviewType.BUBBLE && (
          <ThemePreviewBubble
            contents={BUBBLE_PREVIEW_CONTENT}
            settings={settings}
            customStyle={customStyle}
          />
        )}
        {widgetType === ThemeDetailPreviewType.BANNER && (
          <BannerPreview
            contents={BANNER_PREVIEW_CONTENT}
            settings={settings}
            customStyle={customStyle}
          />
        )}
        {widgetType === ThemeDetailPreviewType.NPS && (
          <ThemePreviewModal
            contents={NPS_PREVIEW_CONTENT}
            settings={settings}
            customStyle={customStyle}
          />
        )}
        {widgetType === ThemeDetailPreviewType.LAUNCHER_ICON && (
          <ThemePreviewLauncher type={LauncherDataType.ICON} settings={settings} />
        )}
        {widgetType === ThemeDetailPreviewType.LAUNCHER_BEACON && (
          <ThemePreviewLauncher type={LauncherDataType.BEACON} settings={settings} />
        )}
        {widgetType === ThemeDetailPreviewType.LAUNCHER_BUTTON && (
          <ThemePreviewLauncher type={LauncherDataType.BUTTON} settings={settings} />
        )}
        {(widgetType === ThemeDetailPreviewType.CHECKLIST ||
          widgetType === ThemeDetailPreviewType.CHECKLIST_LAUNCHER) && (
          <ThemePreviewChecklist
            expanded={widgetType === ThemeDetailPreviewType.CHECKLIST}
            settings={settings}
          />
        )}
        {(widgetType === ThemeDetailPreviewType.RESOURCE_CENTER ||
          widgetType === ThemeDetailPreviewType.RESOURCE_CENTER_LAUNCHER) && (
          <ThemePreviewResourceCenter
            expanded={widgetType === ThemeDetailPreviewType.RESOURCE_CENTER}
            settings={settings}
          />
        )}
      </BrowserFrame>
    </div>
  );
}
