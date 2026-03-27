import { memo, useCallback, useEffect, useRef } from 'react';
import { cn } from '@usertour-packages/tailwind';
import { useResourceCenterContext } from './context';
import { ResourceCenterTrigger } from './resource-center-trigger';

interface ResourceCenterFrameRootProps {
  children: React.ReactNode;
  launcherText?: string;
  isAnimating?: boolean;
}

export const ResourceCenterFrameRoot = memo(
  ({ children, launcherText, isAnimating = false }: ResourceCenterFrameRootProps) => {
    const { isOpen, handleExpandedChange } = useResourceCenterContext();
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
        className={cn(
          'usertour-widget-resource-center-frame-root group',
          'relative h-full w-full flex flex-col overflow-hidden usertour-root text-sdk-foreground',
        )}
      >
        <div
          className={cn(
            'min-w-0 flex-1 flex items-start justify-start overflow-hidden rounded-[inherit]',
            'bg-sdk-resource-center-launcher-background',
            'group-data-[state=open]:absolute group-data-[state=open]:invisible',
          )}
        >
          <ResourceCenterTrigger onClick={handleOpen} launcherText={launcherText} layout="inline" />
        </div>
        {children}
      </div>
    );
  },
);

ResourceCenterFrameRoot.displayName = 'ResourceCenterFrameRoot';
