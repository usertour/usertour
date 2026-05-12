'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { EXTENSION_SIDEBAR_MAIN } from '@usertour-packages/constants';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { cn } from '@usertour-packages/tailwind';
import { useRef } from 'react';
import { useBuilderContext } from '../../contexts';
import { SidebarContents } from './sidebar-contents';
import { SidebarCreate } from './sidebar-create';
import { SidebarFooter } from './sidebar-footer';
import { SidebarHeader } from './sidebar-header';
import { SidebarMini } from './sidebar-mini';
import { SidebarTheme } from './sidebar-theme';

export const BuilderSideBar = () => {
  const { position, currentContent, currentVersion, zIndex, saveContent, isLoading, onSaved } =
    useBuilderContext();
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
