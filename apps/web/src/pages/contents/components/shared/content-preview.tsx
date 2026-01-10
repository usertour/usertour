import { EyeNoneIcon } from '@usertour-packages/icons';
import * as SharedPopper from '@usertour-packages/sdk';
import { ChecklistContainer, ChecklistDropdown } from '@usertour-packages/sdk';
import { ChecklistProgress } from '@usertour-packages/sdk';
import { ChecklistItems } from '@usertour-packages/sdk';
import { ChecklistDismiss } from '@usertour-packages/sdk';
import { PopperMadeWith } from '@usertour-packages/sdk';
import { ChecklistStaticPopper } from '@usertour-packages/sdk';
import { ChecklistRoot } from '@usertour-packages/sdk';
import { LauncherContainer, LauncherView } from '@usertour-packages/sdk/src/launcher';
import { LauncherRoot } from '@usertour-packages/sdk/src/launcher';
import { ContentEditorSerialize } from '@usertour-packages/shared-editor';
import { convertSettings, convertToCssVars } from '@usertour/helpers';
import { ChecklistData, ContentVersion, LauncherData, Step, Theme } from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';
import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMeasure } from 'react-use';
import { useSubscriptionContext } from '@/contexts/subscription-context';

import type { CSSProperties, RefCallback } from 'react';

// Constants for scaled preview
const INITIAL_SCALE = 0.01;
const MAX_SCALE = 1;

const EmptyContentPreview = () => {
  return <img src="/images/empty.png" className="h-[160px]" />;
};

/**
 * Calculate the appropriate scale factor to fit content within max dimensions
 * Returns null if dimensions are invalid
 */
const calculateScale = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): number | null => {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const widthScale = maxWidth / width;
  const heightScale = maxHeight / height;
  const newScale = Math.min(widthScale, heightScale, MAX_SCALE);

  return Number.isFinite(newScale) && newScale > 0 ? newScale : null;
};

interface UseScaledPreviewOptions {
  maxWidth: number;
  maxHeight: number;
  onContentRectChange?: (contentRect: DOMRect, scale: number) => void;
}

interface UseScaledPreviewResult {
  scale: number;
  contentRef: RefCallback<HTMLDivElement>;
  containerStyle: CSSProperties;
}

/**
 * Custom hook for calculating and managing scaled preview state
 * Uses ResizeObserver to measure original (unscaled) content dimensions
 */
const useScaledPreview = ({
  maxWidth,
  maxHeight,
  onContentRectChange,
}: UseScaledPreviewOptions): UseScaledPreviewResult => {
  const [scale, setScale] = useState<number>(INITIAL_SCALE);
  const [contentRef, contentRect] = useMeasure<HTMLDivElement>();
  const prevScaleRef = useRef<number>(INITIAL_SCALE);

  // Calculate and update scale when content dimensions change
  useLayoutEffect(() => {
    if (!contentRect) return;

    // contentRect contains original (unscaled) dimensions because:
    // 1. useMeasure uses ResizeObserver which measures layout dimensions
    // 2. Scale transform is applied to outer container, not the measured element
    const newScale = calculateScale(
      contentRect.width ?? 0,
      contentRect.height ?? 0,
      maxWidth,
      maxHeight,
    );

    if (newScale !== null && newScale !== prevScaleRef.current) {
      prevScaleRef.current = newScale;
      setScale(newScale);
    }
  }, [contentRect, maxWidth, maxHeight]);

  // Notify parent of rect/scale changes
  useLayoutEffect(() => {
    if (onContentRectChange && contentRect) {
      onContentRectChange(contentRect as DOMRect, scale);
    }
  }, [contentRect, scale, onContentRectChange]);

  // Memoize container style
  const containerStyle = useMemo<CSSProperties>(
    () => ({
      scale: `${scale}`,
    }),
    [scale],
  );

  return {
    scale,
    contentRef,
    containerStyle,
  };
};

interface ScaledPreviewContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
  onContentRectChange?: (contentRect: DOMRect, scale: number) => void;
}

/**
 * Container component that scales its children to fit within specified max dimensions
 * Uses smooth transition animation when scale changes
 */
const ScaledPreviewContainer = forwardRef<HTMLDivElement, ScaledPreviewContainerProps>(
  (
    {
      children,
      maxWidth = 300,
      maxHeight = 160,
      className = 'origin-[center_center]',
      onContentRectChange,
    },
    ref,
  ) => {
    const handleContentRectChange = useCallback(
      (contentRect: DOMRect, scale: number) => {
        onContentRectChange?.(contentRect, scale);
      },
      [onContentRectChange],
    );

    const { contentRef, containerStyle } = useScaledPreview({
      maxWidth,
      maxHeight,
      onContentRectChange: handleContentRectChange,
    });

    return (
      <div
        ref={ref}
        style={containerStyle}
        className={cn('[&_iframe]:pointer-events-none', className)}
      >
        <div ref={contentRef}>{children}</div>
      </div>
    );
  },
);

ScaledPreviewContainer.displayName = 'ScaledPreviewContainer';

interface FlowPreviewProps {
  currentTheme: Theme;
  currentStep: Step;
}
const FlowPreview = ({ currentTheme, currentStep }: FlowPreviewProps) => {
  const isHidddenStep = currentStep.type === 'hidden';
  if (isHidddenStep) {
    return (
      <div className="w-40 h-32 flex  flex-none items-center justify-center">
        <EyeNoneIcon className="w-8 h-8" />
      </div>
    );
  }

  return (
    <SharedPopper.Popper
      open={true}
      zIndex={1}
      globalStyle={convertToCssVars(convertSettings(currentTheme.settings))}
    >
      <SharedPopper.PopperStaticContent
        arrowSize={{ width: 20, height: 10 }}
        side="bottom"
        showArrow={false}
        width={`${currentStep.setting.width}px`}
        height={'auto'}
      >
        {currentStep.setting.skippable && <SharedPopper.PopperClose />}
        <ContentEditorSerialize contents={currentStep.data} />
      </SharedPopper.PopperStaticContent>
    </SharedPopper.Popper>
  );
};

const LauncherPreview = ({
  currentTheme,
  currentVersion,
}: {
  currentTheme: Theme;
  currentVersion: ContentVersion;
}) => {
  const data = currentVersion.data as LauncherData;
  const themeSettings = currentTheme.settings;

  return (
    <LauncherRoot themeSettings={themeSettings} data={data}>
      <LauncherContainer>
        <LauncherView
          type={data.type}
          iconType={data.iconType}
          iconSource={data.iconSource}
          iconUrl={data.iconUrl}
          style={{
            zIndex: 1,
          }}
        />
      </LauncherContainer>
    </LauncherRoot>
  );
};

const ChecklistPreview = (props: {
  currentTheme: Theme;
  currentVersion: ContentVersion;
}) => {
  const { currentTheme, currentVersion } = props;
  const data = currentVersion.data as ChecklistData;
  const themeSettings = currentTheme.settings;
  const { shouldShowMadeWith } = useSubscriptionContext();

  return (
    <ChecklistRoot data={data} themeSettings={themeSettings} zIndex={10000}>
      <ChecklistContainer>
        <ChecklistStaticPopper>
          <ChecklistDropdown />
          <ChecklistProgress width={45} />
          <ChecklistItems />
          <ChecklistDismiss />
          {shouldShowMadeWith && <PopperMadeWith />}
        </ChecklistStaticPopper>
      </ChecklistContainer>
    </ChecklistRoot>
  );
};

export {
  FlowPreview,
  LauncherPreview,
  ChecklistPreview,
  EmptyContentPreview,
  ScaledPreviewContainer,
};
