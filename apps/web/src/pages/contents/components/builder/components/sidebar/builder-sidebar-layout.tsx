import { CardFooter, CardHeader, CardTitle } from '@usertour/ui';
import type { ReactNode } from 'react';
import { useBuilderStore, useIsBusy } from '@/pages/contents/components/builder/core';
import { FloatingSidebarPanel } from '@/pages/contents/components/builder/components/sidebar/floating-sidebar-panel';
import { SidebarFooter } from '@/pages/contents/components/builder/components/sidebar/sidebar-footer';
import { SidebarHeader } from '@/pages/contents/components/builder/components/sidebar/sidebar-header';

export interface BuilderSidebarLayoutProps {
  /** Per-type body — the page's own `<CardContent>` settings panel. */
  children: ReactNode;
  /** Save handler, from `useSidebarSave()`. */
  onSave: () => Promise<void>;
}

// Header (content name) + body slot + Save footer, inside the shared floating
// panel chrome — the layout every data-blob sidebar page (Banner / Launcher /
// Checklist / ResourceCenter) shares. Flow's FLOW-mode sidebar
// (`BuilderSideBar`) renders into FloatingSidebarPanel via its own layout
// route instead, because it needs the container ref for `SidebarCreate`.
export const BuilderSidebarLayout = ({ children, onSave }: BuilderSidebarLayoutProps) => {
  const currentContent = useBuilderStore((state) => state.currentContent);
  const isBusy = useIsBusy();
  return (
    <FloatingSidebarPanel width={320}>
      <CardHeader className="flex-none border-b border-border/50 px-5 py-4">
        <CardTitle className="flex h-7 items-center pr-16 text-base font-medium">
          <SidebarHeader title={currentContent?.name ?? ''} />
        </CardTitle>
      </CardHeader>
      {children}
      <CardFooter className="flex-none border-t border-border/50 p-4">
        <SidebarFooter onSave={onSave} isLoading={isBusy} />
      </CardFooter>
    </FloatingSidebarPanel>
  );
};

BuilderSidebarLayout.displayName = 'BuilderSidebarLayout';
