import { CardFooter, CardHeader, CardTitle } from '@usertour/ui';
import type { ReactNode } from 'react';
import { useBuilderStore, useIsBusy } from '@/pages/contents/components/builder/core';
import { SidebarContainer } from '@/pages/contents/components/builder/core/components/sidebar/sidebar-container';
import { SidebarFooter } from '@/pages/contents/components/builder/core/components/sidebar/sidebar-footer';
import { SidebarHeader } from '@/pages/contents/components/builder/core/components/sidebar/sidebar-header';

export interface BuilderSidebarLayoutProps {
  /** Per-type body — the page's own `<CardContent>` settings panel. */
  children: ReactNode;
  /** Save handler, from `useSidebarSave()`. */
  onSave: () => Promise<void>;
}

// Header (content name) + body slot + Save footer — the chrome every
// data-blob sidebar page (Banner / Launcher / Checklist / ResourceCenter)
// shares. Flow's FLOW-mode sidebar (`BuilderSideBar`) stays separate: it
// needs the container ref for `SidebarCreate`, which `SidebarContainer`
// doesn't expose.
export const BuilderSidebarLayout = ({ children, onSave }: BuilderSidebarLayoutProps) => {
  const currentContent = useBuilderStore((state) => state.currentContent);
  const isBusy = useIsBusy();
  return (
    <SidebarContainer>
      <CardHeader className="flex-none p-4 space-y-3">
        <CardTitle className="flex h-8">
          <SidebarHeader title={currentContent?.name ?? ''} />
        </CardTitle>
      </CardHeader>
      {children}
      <CardFooter className="flex p-5">
        <SidebarFooter onSave={onSave} isLoading={isBusy} />
      </CardFooter>
    </SidebarContainer>
  );
};

BuilderSidebarLayout.displayName = 'BuilderSidebarLayout';
