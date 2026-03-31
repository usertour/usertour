import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { cn } from '@usertour-packages/tailwind';
import { useResourceCenterContext } from './context';
import { RC_DEFAULTS } from './constants';
import { ResourceCenterTrigger } from './resource-center-trigger';

interface ResourceCenterFrameRootProps {
  children: React.ReactNode;
  isAnimating?: boolean;
  mode?: 'dom' | 'iframe';
  onLauncherSizeChange?: (rect: { width: number; height: number }) => void;
  onContentSizeChange?: (rect: { width: number; height: number }) => void;
}

export const ResourceCenterFrameRoot = memo(
  ({
    children,
    isAnimating = false,
    mode = 'iframe',
    onLauncherSizeChange,
    onContentSizeChange,
  }: ResourceCenterFrameRootProps) => {
    const { isOpen, handleExpandedChange, themeSetting, animateFrame } = useResourceCenterContext();
    const rootRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const openWidth = themeSetting.resourceCenter?.normalWidth ?? RC_DEFAULTS.normalWidth;

    // Synchronous measurement at openWidth when isOpen changes — before paint, before animation
    useLayoutEffect(() => {
      const el = contentRef.current;
      if (!el || !isOpen) return;
      // Temporarily force width to openWidth for accurate height measurement
      const savedWidth = el.style.width;
      el.style.width = `${openWidth}px`;
      const height = el.offsetHeight;
      el.style.width = savedWidth;
      onContentSizeChange?.({ width: openWidth, height });
    }, [isOpen, openWidth, onContentSizeChange]);

    // ResizeObserver for content changes while panel is fully open (not during animation)
    useEffect(() => {
      const el = contentRef.current;
      if (!el || !isOpen || isAnimating) return;
      const observer = new ResizeObserver(() => {
        onContentSizeChange?.({ width: el.offsetWidth, height: el.offsetHeight });
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, [isOpen, isAnimating, onContentSizeChange]);

    useEffect(() => {
      const root = rootRef.current;
      const activeElement = document.activeElement;
      if (!root || !(activeElement instanceof HTMLElement) || !root.contains(activeElement)) return;
      activeElement.blur();
    }, [isOpen]);

    const handleOpen = useCallback(
      async () => await handleExpandedChange(true),
      [handleExpandedChange],
    );

    return (
      <div
        ref={rootRef}
        data-state={isOpen ? 'open' : 'closed'}
        data-animating={isAnimating || undefined}
        data-animate-frame={animateFrame ? 'true' : 'false'}
        className={cn(
          'group',
          'relative w-full flex flex-col overflow-hidden text-sdk-foreground bg-sdk-background',
          mode === 'iframe' && 'min-h-screen',
          mode !== 'iframe' && 'h-full',
          'rounded-sdk-resource-center-launcher data-[state=open]:rounded-sdk-popper',
          'data-[animate-frame=true]:transition-[border-radius]',
          'data-[animate-frame=true]:duration-sdk-resource-center',
        )}
      >
        <div
          className={cn(
            'min-w-0 flex-1 flex items-start justify-start overflow-hidden rounded-[inherit]',
            'bg-sdk-resource-center-launcher-background',
            'group-data-[state=open]:absolute group-data-[state=open]:invisible',
          )}
        >
          <ResourceCenterTrigger
            onClick={handleOpen}
            onSizeChange={onLauncherSizeChange}
            layout="inline"
          />
        </div>
        <div ref={contentRef}>{children}</div>
      </div>
    );
  },
);

ResourceCenterFrameRoot.displayName = 'ResourceCenterFrameRoot';
