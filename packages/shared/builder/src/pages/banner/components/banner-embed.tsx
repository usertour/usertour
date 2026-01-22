import { EXTENSION_CONTENT_POPPER } from '@usertour-packages/constants';
import { useThemeListContext } from '@usertour-packages/contexts';
import { useSettingsStyles } from '@usertour-packages/widget';
import { ContentEditor, ContentEditorRoot } from '@usertour-packages/shared-editor';
import { Theme } from '@usertour/types';
import { useEffect, useMemo, useRef } from 'react';

import { useBuilderContext } from '../../../contexts';
import { useAws } from '../../../hooks/use-aws';
import { getDefaultDataForType } from '../../../utils/default-data';

export const BannerEmbed = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { themeList } = useThemeListContext();
  const { projectId } = useBuilderContext();
  const { upload } = useAws();

  const handleCustomUploadRequest = (file: File): Promise<string> => {
    return upload(file);
  };

  // Find default theme from theme list
  const theme = useMemo<Theme | undefined>(() => {
    if (!themeList || themeList.length === 0) {
      return undefined;
    }
    return themeList.find((item) => item.isDefault);
  }, [themeList]);

  // Use unified settings hook for CSS vars generation
  const { globalStyle } = useSettingsStyles(theme?.settings);

  // Apply CSS variables to container
  useEffect(() => {
    if (containerRef.current && globalStyle) {
      containerRef.current.style.cssText = globalStyle;
    }
  }, [globalStyle]);

  return (
    <>
      <div ref={containerRef}>
        <div className="usertour-banner usertour-banner--animate-true usertour-banner--embed-mode-BODY_FIRST usertour-banner--sticky-false usertour-banner--overlay-false">
          <div
            className="w-full"
            style={{
              background: 'var(--usertour-banner-background-color)',
              color: 'var(--usertour-banner-foreground-color)',
            }}
          >
            <ContentEditor
              projectId={projectId}
              zIndex={11111 + EXTENSION_CONTENT_POPPER}
              customUploadRequest={handleCustomUploadRequest}
              initialValue={getDefaultDataForType('tooltip') as ContentEditorRoot[]}
              onValueChange={() => {}}
            />
          </div>
        </div>
      </div>
    </>
  );
};

BannerEmbed.displayName = 'BannerEmbed';
