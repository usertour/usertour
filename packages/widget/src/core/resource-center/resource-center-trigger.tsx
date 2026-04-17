import { forwardRef, memo, useEffect, useState } from 'react';
import { QuestionMarkCircledIcon } from '@usertour-packages/icons';
import { useSize } from '@usertour-packages/react-use-size';
import { cn } from '@usertour-packages/tailwind';
import { Button } from '../../primitives';
import { useResourceCenterContext } from './context';
import { RESOURCE_CENTER_DEFAULTS } from './constants';

// ============================================================================
// Launcher Icon
// ============================================================================

export const ResourceCenterLauncherIcon = memo(
  ({
    iconType,
    iconUrl,
    imageHeight,
    launcherHeight,
  }: {
    iconType?: string;
    iconUrl?: string;
    imageHeight?: number;
    launcherHeight?: number;
  }) => {
    const h = imageHeight ?? RESOURCE_CENTER_DEFAULTS.imageHeight;
    if (iconType === 'custom' && iconUrl) {
      return (
        <img src={iconUrl} alt="" style={{ height: h, width: 'auto', objectFit: 'contain' }} />
      );
    }
    if (iconType === 'plaintext-question-mark') {
      const textSize = Math.round(
        (launcherHeight ?? RESOURCE_CENTER_DEFAULTS.launcherHeight) * 0.6,
      );
      return (
        <span className="leading-none" style={{ fontSize: textSize }}>
          ?
        </span>
      );
    }
    return <QuestionMarkCircledIcon width={h} height={h} />;
  },
);

ResourceCenterLauncherIcon.displayName = 'ResourceCenterLauncherIcon';

// ============================================================================
// Trigger (the launcher button content)
// ============================================================================

interface ResourceCenterTriggerProps {
  onClick?: () => void;
  onSizeChange?: (rect: { width: number; height: number }) => void;
  layout?: 'fill' | 'inline';
}

export const ResourceCenterTrigger = forwardRef<HTMLButtonElement, ResourceCenterTriggerProps>(
  (props, ref) => {
    const { onClick, onSizeChange, layout = 'fill' } = props;
    const { themeSetting, data } = useResourceCenterContext();
    const launcher = themeSetting.resourceCenterLauncherButton;

    const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null);
    const rect = useSize(contentRef);

    useEffect(() => {
      if (rect) {
        onSizeChange?.(rect);
      }
    }, [rect, onSizeChange]);

    const showResourceCenterText =
      launcher?.textMode === 'resource-center-text' && !!data.buttonText;

    const buttonClassName = cn(
      'rounded-sdk-resource-center-launcher flex bg-transparent',
      'cursor-pointer items-center',
      'group-data-[animate-frame=true]:transition-opacity',
      'group-data-[animate-frame=true]:duration-sdk-resource-center',
      'group-data-[state=closed]:opacity-100 group-data-[state=open]:opacity-0',
      layout === 'fill' ? 'h-full w-full justify-center' : 'inline-flex justify-start',
      'hover:bg-sdk-resource-center-launcher-hover',
      'active:bg-sdk-resource-center-launcher-active',
      'focus-visible:outline-none',
      'focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-transparent',
      'focus-visible:ring-offset-[3px] focus-visible:ring-offset-sdk-resource-center-launcher-foreground/30',
      'text-sdk-resource-center-launcher-foreground font-sdk-resource-center-launcher',
    );

    const launcherHeight = launcher?.height ?? RESOURCE_CENTER_DEFAULTS.launcherHeight;

    return (
      <Button
        variant="custom"
        ref={ref}
        style={{
          minWidth: launcherHeight,
          height: launcherHeight,
        }}
        className={buttonClassName}
        onClick={onClick}
        aria-label={`Open ${data.buttonText}`}
      >
        <div
          ref={setContentRef}
          className="flex items-center whitespace-nowrap px-sdk-resource-center-launcher"
        >
          {showResourceCenterText && (
            <span className="mr-sdk-resource-center-launcher-gap text-sm font-semibold whitespace-nowrap">
              {data.buttonText}
            </span>
          )}
          <span
            className="flex shrink-0 items-center justify-center"
            style={{ width: launcherHeight / 2, height: launcherHeight / 2 }}
          >
            <ResourceCenterLauncherIcon
              iconType={launcher?.iconType}
              iconUrl={launcher?.iconUrl}
              imageHeight={launcher?.imageHeight}
              launcherHeight={launcherHeight}
            />
          </span>
        </div>
      </Button>
    );
  },
);

ResourceCenterTrigger.displayName = 'ResourceCenterTrigger';
