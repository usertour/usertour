import { memo, useCallback, useEffect, useRef } from 'react';
import { cn } from '@usertour-packages/tailwind';
import { useResourceCenterContext } from './context';
import { ResourceCenterTrigger } from './resource-center-trigger';

interface ResourceCenterFrameRootProps {
  children: React.ReactNode;
  isAnimating?: boolean;
  mode?: 'dom' | 'iframe';
  onLauncherSizeChange?: (rect: { width: number; height: number }) => void;
}

export const ResourceCenterFrameRoot = memo(
  ({
    children,
    isAnimating = false,
    mode = 'iframe',
    onLauncherSizeChange,
  }: ResourceCenterFrameRootProps) => {
    const { isOpen, handleExpandedChange, animateFrame } = useResourceCenterContext();
    const rootRef = useRef<HTMLDivElement>(null);

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
          'relative w-full flex flex-col overflow-hidden text-sdk-resource-center-foreground bg-sdk-resource-center-background',
          mode === 'iframe' && 'h-screen',
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
        <div className={cn('flex flex-col', isOpen && 'flex-1 min-h-0')}>{children}</div>
      </div>
    );
  },
);

ResourceCenterFrameRoot.displayName = 'ResourceCenterFrameRoot';
