'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { EXTENSION_SIDEBAR_MAIN } from '@usertour-packages/constants';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { cn } from '@usertour/helpers';
import { useRef } from 'react';
import { useBuilderContext } from '../../contexts';
import { SidebarFooter } from '../sidebar/sidebar-footer';
import { SidebarHeader } from '../sidebar/sidebar-header';
import { SidebarMini } from '../sidebar/sidebar-mini';
import { SidebarTheme } from '../sidebar/sidebar-theme';

const BannerBuilderBody = () => {
  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full ">
        <div className="flex-col space-y-3 p-4">
          <SidebarTheme />
          Banner
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const BannerBuilderHeader = () => {
  const { currentContent } = useBuilderContext();
  return (
    <CardHeader className="flex-none p-4 space-y-3">
      <CardTitle className="flex h-8	">
        <SidebarHeader title={currentContent?.name ?? ''} />
      </CardTitle>
    </CardHeader>
  );
};

const BannerBuilderFooter = () => {
  return (
    <CardFooter className="flex p-5">
      <SidebarFooter />
    </CardFooter>
  );
};

export const BannerBuilder = () => {
  const { position, zIndex } = useBuilderContext();
  const sidbarRef = useRef<HTMLDivElement | null>(null);
  return (
    <>
      <div
        style={{ zIndex: zIndex + EXTENSION_SIDEBAR_MAIN }}
        className={cn('w-80 h-screen p-2 fixed top-0', position === 'left' ? 'left-0' : 'right-0')}
        ref={sidbarRef}
      >
        <SidebarMini container={sidbarRef} />
        <Card className="h-full flex flex-col bg-background-800">
          <BannerBuilderHeader />
          <BannerBuilderBody />
          <BannerBuilderFooter />
        </Card>
      </div>
    </>
  );
};

BannerBuilder.displayName = 'BannerBuilder';
