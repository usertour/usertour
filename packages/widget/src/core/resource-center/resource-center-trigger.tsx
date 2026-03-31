import { forwardRef, memo, useEffect, useState } from 'react';
import { QuestionMarkCircledIcon } from '@usertour-packages/icons';
import { useSize } from '@usertour-packages/react-use-size';
import { cn } from '@usertour-packages/tailwind';
import { Button } from '../../primitives';
import { useResourceCenterContext } from './context';
import { RC_DEFAULTS } from './constants';

// ============================================================================
// Launcher Icon
// ============================================================================

export const ResourceCenterLauncherIcon = memo(
  ({
    iconType,
    iconUrl,
    imageHeight,
  }: {
    iconType?: string;
    iconUrl?: string;
    imageHeight?: number;
  }) => {
    const h = imageHeight ?? RC_DEFAULTS.imageHeight;
    if (iconType === 'custom' && iconUrl) {
      return (
        <img src={iconUrl} alt="" style={{ height: h, width: 'auto', objectFit: 'contain' }} />
      );
    }
    if (iconType === 'plaintext-question-mark') {
      return (
        <span className="text-lg font-bold leading-none" style={{ fontSize: h }}>
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
    const showDividerAfterChecklistText = showChecklistText;
    const showDividerBeforeResourceCenterText = showChecklistInfo && showResourceCenterText;

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

    const launcherHeight = launcher?.height ?? RC_DEFAULTS.launcherHeight;

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
          className="flex items-center whitespace-nowrap gap-2"
          style={{
            paddingLeft: launcher?.height ? `${Number(launcher.height) / 2}px` : undefined,
            paddingRight: launcher?.height ? `${Number(launcher.height) / 2}px` : undefined,
            transitionDuration: 'var(--usertour-resource-center-transition-duration)',
          }}
        >
          {uncompletedCount > 0 && (
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-sdk-resource-center-launcher-foreground/10 px-2 text-sm font-bold text-sdk-resource-center-launcher-foreground">
              {uncompletedCount}
            </span>
          )}
          {showChecklistText && (
            <span className="text-sm font-semibold whitespace-nowrap">{launcherText}</span>
          )}
          {showDividerAfterChecklistText && (
            <span className="h-6 w-px bg-sdk-resource-center-launcher-foreground/20" />
          )}
          {showDividerBeforeResourceCenterText && (
            <span className="h-6 w-px bg-sdk-resource-center-launcher-foreground/20" />
          )}
          {showResourceCenterText && (
            <span className="text-sm font-semibold whitespace-nowrap">{data.buttonText}</span>
          )}
          <span
            className="flex shrink-0 items-center justify-center"
            style={{ width: launcherHeight / 2, height: launcherHeight / 2 }}
          >
            <ResourceCenterLauncherIcon
              iconType={launcher?.iconType}
              iconUrl={launcher?.iconUrl}
              imageHeight={launcher?.imageHeight}
            />
          </span>
        </div>
      </Button>
    );
  },
);

ResourceCenterTrigger.displayName = 'ResourceCenterTrigger';
