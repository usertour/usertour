import { forwardRef, memo, useEffect, useMemo, useState } from 'react';
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

  return <div className="usertour-widget-resource-center-launcher-unread-badge">{count}</div>;
});

ResourceCenterBadge.displayName = 'ResourceCenterBadge';

// ============================================================================
// Trigger (the launcher button content)
// ============================================================================

interface ResourceCenterTriggerProps {
  onClick?: () => void;
  badgeCount?: number;
  launcherText?: string;
  onSizeChange?: (rect: { width: number; height: number }) => void;
  layout?: 'fill' | 'inline';
}

export const ResourceCenterTrigger = forwardRef<HTMLButtonElement, ResourceCenterTriggerProps>(
  (props, ref) => {
    const { onClick, badgeCount = 0, launcherText, onSizeChange, layout = 'fill' } = props;
    const { themeSetting, data } = useResourceCenterContext();
    const launcher = themeSetting.resourceCenterLauncherButton;

    const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null);
    const rect = useSize(contentRef);

    useEffect(() => {
      if (rect) {
        onSizeChange?.(rect);
      }
    }, [rect, onSizeChange]);

    const resolvedText = useMemo(() => {
      if (launcher?.textMode === 'no-text') return undefined;
      if (launcher?.textMode === 'active-checklist-text' && launcherText) return launcherText;
      return data.buttonText;
    }, [launcher?.textMode, launcherText, data.buttonText]);

    const buttonClassName = cn(
      'rounded-sdk-resource-center-launcher flex bg-transparent',
      'cursor-pointer items-center',
      'transition-opacity duration-sdk-resource-center',
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
        aria-label={`Open ${data.buttonText}${badgeCount > 0 ? ` (${badgeCount} unread)` : ''}`}
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
          {badgeCount > 0 && (
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-sdk-resource-center-launcher-foreground/10 px-2 text-sm font-bold text-sdk-resource-center-launcher-foreground">
              {badgeCount}
            </span>
          )}
          {resolvedText && (
            <span className="text-sm font-semibold whitespace-nowrap">{resolvedText}</span>
          )}
          {(badgeCount > 0 || resolvedText) && (
            <span className="h-6 w-px bg-sdk-resource-center-launcher-foreground/20" />
          )}
          <span className="flex items-center justify-center">
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
