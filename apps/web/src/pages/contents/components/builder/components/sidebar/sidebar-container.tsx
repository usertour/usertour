import { SidebarMini } from '@/pages/contents/components/builder/components/sidebar/sidebar-mini';

import { Card } from '@usertour/ui';
import { EXTENSION_SIDEBAR_MAIN } from '@usertour/constants';
import { cn } from '@usertour/tailwind';
import { useRef } from 'react';
import { useBuilderConfig, useBuilderStore } from '@/pages/contents/components/builder/core';

interface SidebarContainerProps {
  children: React.ReactNode;
  className?: string;
}
export const SidebarContainer = ({ children, className }: SidebarContainerProps) => {
  const { zIndex } = useBuilderConfig();
  const position = useBuilderStore((state) => state.position);
  const sidbarRef = useRef<HTMLDivElement | null>(null);
  return (
    <div
      style={{ zIndex: zIndex + EXTENSION_SIDEBAR_MAIN }}
      className={cn(
        'w-80 h-screen p-2 fixed top-0',
        position === 'left' ? 'left-0' : 'right-0',
        className,
      )}
      ref={sidbarRef}
    >
      <SidebarMini container={sidbarRef} />
      <Card className="h-full flex flex-col bg-background-800">{children}</Card>
    </div>
  );
};

SidebarContainer.displayName = 'SidebarContainer';
