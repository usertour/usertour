'use client';

import { EXTENSION_CONTENT_POPPER } from '@usertour-packages/constants';
import { useThemeListContext } from '@usertour-packages/contexts';
import { useSettingsStyles } from '@usertour-packages/widget';
import { ContentEditor, type ContentEditorRoot } from '@usertour-packages/shared-editor';
import type { Theme } from '@usertour/types';
import { useEffect, useMemo, useRef } from 'react';

import { useBuilderContext, useBannerContext } from '../../../contexts';
import { useAws } from '../../../hooks/use-aws';
import { getDefaultDataForType } from '../../../utils/default-data';

export const BannerEmbed = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { themeList } = useThemeListContext();
  const { projectId } = useBuilderContext();
  const { localData } = useBannerContext();
  const { upload } = useAws();

  const handleCustomUploadRequest = (file: File): Promise<string> => {
    return upload(file);
  };

  const theme = useMemo<Theme | undefined>(() => {
    if (!themeList?.length) {
      return undefined;
    }
    return themeList.find((item) => item.isDefault);
  }, [themeList]);

  const { globalStyle } = useSettingsStyles(theme?.settings);

  useEffect(() => {
    if (containerRef.current && globalStyle) {
      containerRef.current.style.cssText = globalStyle;
    }
  }, [globalStyle]);

  const data = localData;
  const animate = data?.animateWhenEmbedAppears ?? true;
  const overlay = data?.overlayEmbedOverAppContent ?? false;
  const sticky = data?.stickToTopOfViewport ?? false;
  const embedModeClass = data?.embedPlacement
    ? `usertour-banner--embed-mode-${data.embedPlacement.replace(/-/g, '_').toUpperCase()}`
    : 'usertour-banner--embed-mode-BODY_FIRST';
  const zIndex = data?.zIndex ?? 11111 + EXTENSION_CONTENT_POPPER;
  const contentStyle = useMemo(() => {
    const style: React.CSSProperties = {
      background: 'var(--usertour-banner-background-color)',
      color: 'var(--usertour-banner-foreground-color)',
    };
    if (data?.maxContentWidth != null) {
      style.maxWidth = `${data.maxContentWidth}px`;
    }
    if (data?.borderRadius != null) {
      style.borderRadius = `${data.borderRadius}px`;
    }
    return style;
  }, [data?.maxContentWidth, data?.borderRadius]);

  const wrapperStyle = useMemo(() => {
    const style: React.CSSProperties = { zIndex };
    if (data?.maxEmbedWidth != null) {
      style.maxWidth = `${data.maxEmbedWidth}px`;
    }
    if (data?.outerMargin) {
      const { top, right, bottom, left } = data.outerMargin;
      style.margin = `${top}px ${right}px ${bottom}px ${left}px`;
    }
    return style;
  }, [zIndex, data?.maxEmbedWidth, data?.outerMargin]);

  return (
    <div ref={containerRef}>
      <div
        className={`usertour-banner usertour-banner--animate-${String(animate)} ${embedModeClass} usertour-banner--sticky-${String(sticky)} usertour-banner--overlay-${String(overlay)}`}
        style={wrapperStyle}
      >
        <div className="w-full" style={contentStyle}>
          <ContentEditor
            projectId={projectId}
            zIndex={zIndex + EXTENSION_CONTENT_POPPER}
            customUploadRequest={handleCustomUploadRequest}
            initialValue={getDefaultDataForType('tooltip') as ContentEditorRoot[]}
            onValueChange={() => {}}
          />
        </div>
      </div>
    </div>
  );
};

BannerEmbed.displayName = 'BannerEmbed';
