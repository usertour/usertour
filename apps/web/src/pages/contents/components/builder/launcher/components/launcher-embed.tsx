import { ContentEditorRoot } from '@usertour/editor';
import { isEqual } from 'lodash';
import { useCallback, useMemo, useRef } from 'react';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { useCurrentTheme } from '@/pages/contents/components/builder/hooks/use-current-theme';
import { useAws } from '@usertour/hooks';
import { useLauncherEditor } from '@/pages/contents/components/builder/launcher/use-launcher-editor';
import { LauncherContentMain } from '@/pages/contents/components/builder/launcher/components/launcher-content';
import { PlusIcon } from '@usertour/icons';

// A fixed, centered stand-in for the target element on the preview canvas — the
// tooltip and launcher anchor to it. Positioning lives on the wrapper div, so
// it doesn't depend on how the icon forwards className.
const previewTargetAnchorClass = 'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2';

export const LauncherBuilderEmbed = () => {
  const targetAnchorRef = useRef<HTMLDivElement>(null);
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const theme = useCurrentTheme({ fallbackToDefault: true });
  const { data, updateDataTooltip, launcherTarget, launcherTooltip } = useLauncherEditor();
  const { upload } = useAws();

  // The target / tooltip sub-views edit drafts in UI state; overlay them on the
  // saved data so the preview reflects in-flight edits.
  const previewData = useMemo(
    () => ({
      ...data,
      ...(launcherTarget ? { target: launcherTarget } : {}),
      ...(launcherTooltip ? { tooltip: launcherTooltip } : {}),
    }),
    [data, launcherTarget, launcherTooltip],
  );

  const handleTooltipContentChange = useCallback(
    (content: ContentEditorRoot[]) => {
      // The editor can fire without a real change; skip no-op writes.
      if (!isEqual(content, data.tooltip.content)) {
        updateDataTooltip({ content });
      }
    },
    [updateDataTooltip, data.tooltip.content],
  );

  if (!theme || !currentVersion) {
    return null;
  }

  // zIndex 0 = page base layer so the editor's action / element popovers float
  // above the preview widget.
  return (
    <>
      <div ref={targetAnchorRef} aria-hidden className={previewTargetAnchorClass}>
        <PlusIcon width={24} height={24} />
      </div>
      <LauncherContentMain
        theme={theme}
        triggerRef={targetAnchorRef}
        zIndex={0}
        onCustomUploadRequest={upload}
        data={previewData}
        onValueChange={handleTooltipContentChange}
      />
    </>
  );
};

LauncherBuilderEmbed.displayName = 'LauncherBuilderEmbed';
