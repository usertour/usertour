import { EyeNoneIcon } from '@usertour-ui/icons';
import * as SharedPopper from '@usertour-ui/sdk';
import { ChecklistContainer, ChecklistDropdown } from '@usertour-ui/sdk';
import { ChecklistProgress } from '@usertour-ui/sdk';
import { ChecklistItems } from '@usertour-ui/sdk';
import { ChecklistDismiss } from '@usertour-ui/sdk';
import { PopperMadeWith } from '@usertour-ui/sdk';
import { ChecklistStaticPopper } from '@usertour-ui/sdk';
import { ChecklistRoot } from '@usertour-ui/sdk';
import { LauncherContainer, LauncherView } from '@usertour-ui/sdk/src/launcher';
import { LauncherRoot } from '@usertour-ui/sdk/src/launcher';
import { ContentEditorSerialize } from '@usertour-ui/shared-editor';
import { convertSettings, convertToCssVars } from '@usertour-ui/shared-utils';
import { ChecklistData, ContentVersion, LauncherData, Step, Theme } from '@usertour-ui/types';
import { cn } from '@usertour-ui/ui-utils';
import { forwardRef, useEffect, useState } from 'react';
import { useMeasure } from 'react-use';

const EmptyContentPreview = () => {
  return <img src="/images/empty.png" className="h-[160px]" />;
};

interface ScaledPreviewContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
  onContentRectChange?: (contentRect: DOMRect, scale: number) => void;
}

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
    const [scale, setScale] = useState<number>(1);
    const [contentRef, contentRect] = useMeasure<HTMLDivElement>();

    // Calculate scale when content dimensions change
    useEffect(() => {
      if (!contentRect) return;

      const widthScale = maxWidth / contentRect.width;
      const heightScale = maxHeight / contentRect.height;
      const newScale = Math.min(widthScale, heightScale, 1);

      setScale(newScale);
    }, [contentRect]);

    useEffect(() => {
      if (onContentRectChange) {
        onContentRectChange(contentRect as DOMRect, scale);
      }
    }, [contentRect, scale]);

    return (
      <div
        ref={ref}
        style={{
          scale: `${scale}`,
        }}
        className={cn('[&_iframe]:pointer-events-none', className)}
      >
        <div ref={contentRef as any}>{children}</div>
      </div>
    );
  },
);

// Add display name for better debugging
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

  return (
    <ChecklistRoot data={data} themeSettings={themeSettings} zIndex={10000}>
      <ChecklistContainer>
        <ChecklistStaticPopper>
          <ChecklistDropdown />
          <ChecklistProgress width={45} />
          <ChecklistItems />
          <ChecklistDismiss />
          <PopperMadeWith />
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
