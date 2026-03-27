import { memo, useEffect, useState } from 'react';
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
    const [launcherButtonContainer, setLauncherButtonContainer] = useState<HTMLDivElement | null>(
      null,
    );
    const [panelContainer, setPanelContainer] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
      const activeElement = document.activeElement;

      if (
        isOpen &&
        launcherButtonContainer &&
        activeElement instanceof HTMLElement &&
        launcherButtonContainer.contains(activeElement)
      ) {
        activeElement.blur();
      }

      if (
        !isOpen &&
        panelContainer &&
        activeElement instanceof HTMLElement &&
        panelContainer.contains(activeElement)
      ) {
        activeElement.blur();
      }
    }, [isOpen, launcherButtonContainer, panelContainer]);

    return (
      <div
        className={cn(
          'usertour-widget-resource-center-frame-root',
          isAnimating && 'usertour-widget-resource-center-frame-root--animating',
          isOpen
            ? 'usertour-widget-resource-center-frame-root--open'
            : 'usertour-widget-resource-center-frame-root--closed',
          'relative h-full w-full overflow-hidden usertour-root text-sdk-foreground',
        )}
      >
        <div
          ref={setLauncherButtonContainer}
          className="usertour-widget-resource-center-launcher-container bg-sdk-resource-center-launcher-background"
        >
          <div className="usertour-widget-resource-center-launcher-button-wrap">
            <ResourceCenterTrigger
              onClick={async () => await handleExpandedChange(true)}
              launcherText={launcherText}
              layout="inline"
            />
          </div>
        </div>
        <div ref={setPanelContainer} className="contents">
          {children}
        </div>
      </div>
    );
  },
);

ResourceCenterFrameRoot.displayName = 'ResourceCenterFrameRoot';
