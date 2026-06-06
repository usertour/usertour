'use client';

import { CardContent, CardFooter, CardHeader, CardTitle, ScrollArea } from '@usertour/ui';
import { useBuilderStore, useIsBusy } from '@/pages/contents/components/builder/core';
import { useSidebarSave } from '@/pages/contents/components/builder/hooks/use-sidebar-save';
import { SidebarContents } from '@/pages/contents/components/builder/flow/sidebar-contents';
import { SidebarCreate } from '@/pages/contents/components/builder/flow/sidebar-create';
import { SidebarFooter } from '@/pages/contents/components/builder/components/sidebar/sidebar-footer';
import { SidebarHeader } from '@/pages/contents/components/builder/components/sidebar/sidebar-header';
import { SidebarTheme } from '@/pages/contents/components/builder/components/sidebar/sidebar-theme';

// Overview content (theme + step list + create). Rendered into the persistent
// FlowSidebarLayout, which owns the floating panel chrome and side/collapse.
export const BuilderSideBar = () => {
  const currentContent = useBuilderStore((state) => state.currentContent);
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const isLoading = useIsBusy();

  const handleSave = useSidebarSave();

  return (
    <>
      <CardHeader className="flex-none border-b border-border/50 px-5 py-4">
        <CardTitle className="flex h-7 items-center pr-16 text-base font-semibold">
          <SidebarHeader title={currentContent?.name ?? ''} />
        </CardTitle>
      </CardHeader>
      <CardContent className="grow overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-4 p-3">
            <SidebarTheme />
            {currentVersion?.steps && currentVersion.steps.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <SidebarContents />
              </div>
            )}
            <SidebarCreate />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex-none border-t border-border/50 px-4 py-3.5">
        <SidebarFooter onSave={handleSave} isLoading={isLoading} />
      </CardFooter>
    </>
  );
};

BuilderSideBar.displayName = 'BuilderSideBar';
