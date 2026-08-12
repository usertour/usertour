import { memo, useCallback, useEffect, useRef } from 'react';
import { cn } from '@usertour/tailwind';
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
      // ownerDocument, not the global: this component renders inside the
      // widget IFRAME, whose focus lives on the frame's own document — the
      // lexical `document` is the HOST page's, so the containment check could
      // never match in-frame focus and the blur never fired (found during the
      // render-host survey). ownerDocument is correct in both iframe and any
      // future non-iframe host.
      // Duck-typed, not `instanceof HTMLElement`: in-frame elements are
      // instances of the FRAME realm's HTMLElement, so a host-realm instanceof
      // is always false for exactly the elements this effect exists to blur.
      const activeElement = root?.ownerDocument.activeElement as HTMLElement | null;
      if (
        !root ||
        !activeElement ||
        typeof activeElement.blur !== 'function' ||
        !root.contains(activeElement)
      ) {
        return;
      }
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
          // The panel backdrop applies to the OPEN state only. This root is
          // shared by the compact launcher and the expanded panel; painting it
          // unconditionally put the (light) panel background behind the dark
          // round launcher, where it bled through the anti-aliased seam
          // between the iframe clip and the root's own radius — a light ring
          // around the launcher on dark host pages. Compact state stays
          // transparent: the trigger layer paints its own launcher background.
          'relative w-full flex flex-col overflow-hidden text-sdk-foreground',
          'data-[state=open]:bg-sdk-background',
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
        <div className={cn('flex flex-col min-w-sdk-resource-center', isOpen && 'flex-1 min-h-0')}>
          {children}
        </div>
      </div>
    );
  },
);

ResourceCenterFrameRoot.displayName = 'ResourceCenterFrameRoot';
