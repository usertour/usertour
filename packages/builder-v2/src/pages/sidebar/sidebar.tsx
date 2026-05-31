'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, ScrollArea } from '@usertour/ui';
import { EXTENSION_SIDEBAR_MAIN } from '@usertour/constants';
import { cn } from '@usertour/tailwind';
import { useRef } from 'react';
import { useBuilderConfig, useBuilderMethods, useBuilderStore } from '../../contexts';
import { SidebarContents } from './sidebar-contents';
import { SidebarCreate } from './sidebar-create';
import { SidebarFooter } from './sidebar-footer';
import { SidebarHeader } from './sidebar-header';
import { SidebarMini } from './sidebar-mini';
import { SidebarTheme } from './sidebar-theme';

export const BuilderSideBar = () => {
  const { zIndex, onSaved } = useBuilderConfig();
  const { saveContent } = useBuilderMethods();
  const position = useBuilderStore((state) => state.position);
  const currentContent = useBuilderStore((state) => state.currentContent);
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  // isLoading merges initial-content load + save-in-flight (legacy
  // overload). Per docs/conventions/builder-context-migration.md.
  const isLoading = useBuilderStore(
    (state) => state.isLoading || state.saveState.status === 'saving',
  );
  const sidbarRef = useRef<HTMLDivElement | null>(null);

  const handleSave = async () => {
    await saveContent();
    await onSaved?.();
  };

  return (
    <div
      style={{ zIndex: zIndex + EXTENSION_SIDEBAR_MAIN }}
      className={cn('w-80 h-screen p-2 fixed top-0', position === 'left' ? 'left-0' : 'right-0')}
      ref={sidbarRef}
    >
      <SidebarMini container={sidbarRef} />
      <Card className="h-full flex flex-col bg-background-800">
        <CardHeader className="flex-none p-4 space-y-3">
          <CardTitle className="flex h-8	">
            <SidebarHeader title={currentContent?.name ?? ''} />
          </CardTitle>
        </CardHeader>
        <CardContent className="bg-background-900 grow p-0 overflow-hidden">
          <ScrollArea className="h-full ">
            <div className="flex-col space-y-3 p-4">
              <SidebarTheme />
              {currentVersion?.steps && currentVersion.steps.length > 0 && <SidebarContents />}
              <SidebarCreate container={sidbarRef} />
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex p-5">
          <SidebarFooter onSave={handleSave} isLoading={isLoading} />
        </CardFooter>
      </Card>
    </div>
  );
};

BuilderSideBar.displayName = 'BuilderSideBar';
