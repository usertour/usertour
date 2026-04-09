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
// Badge
// ============================================================================

interface ResourceCenterBadgeProps {
  count: number;
}

export const ResourceCenterBadge = memo(({ count }: ResourceCenterBadgeProps) => {
  if (count <= 0) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center cursor-pointer',
        'size-6 rounded-full',
        'text-xs font-bold',
        'bg-sdk-resource-center-badge-background text-sdk-resource-center-badge-foreground',
      )}
    >
      {count}
    </div>
  );
});

ResourceCenterBadge.displayName = 'ResourceCenterBadge';

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
    const { themeSetting, data, launcherText, uncompletedCount } = useResourceCenterContext();
    const launcher = themeSetting.resourceCenterLauncherButton;

    const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null);
    const rect = useSize(contentRef);

    useEffect(() => {
      if (rect) {
        onSizeChange?.(rect);
      }
    }, [rect, onSizeChange]);

    const showChecklistInfo = uncompletedCount > 0;
    const showChecklistText =
      launcher?.textMode === 'active-checklist-text' && showChecklistInfo && !!launcherText;
    const showResourceCenterText =
      launcher?.textMode === 'resource-center-text' && !!data.buttonText;
    const showChecklistDivider = showChecklistInfo;
    const showGapAfterChecklistCount = showChecklistText;

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
        aria-label={`Open ${data.buttonText}${uncompletedCount > 0 ? ` (${uncompletedCount} remaining)` : ''}`}
      >
        <div
          ref={setContentRef}
          className="flex items-center whitespace-nowrap px-sdk-resource-center-launcher"
        >
          {uncompletedCount > 0 && (
            <span
              className={cn(
                'flex h-8 min-w-8 items-center justify-center rounded-full bg-sdk-resource-center-launcher-foreground/10 px-2 text-sm font-bold text-sdk-resource-center-launcher-foreground',
                showGapAfterChecklistCount && 'mr-sdk-resource-center-launcher-gap',
              )}
            >
              {uncompletedCount}
            </span>
          )}
          {showChecklistText && (
            <span className="text-sm font-semibold whitespace-nowrap">{launcherText}</span>
          )}
          {showChecklistDivider && (
            <span className="mx-sdk-resource-center-launcher-divider h-sdk-line-height w-px bg-sdk-resource-center-launcher-foreground/20" />
          )}
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
