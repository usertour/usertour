'use client';

import { CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { ScrollArea } from '@usertour-packages/scroll-area';

import { useBuilderContext, useBannerContext } from '../../contexts';
import { SidebarContainer } from '../sidebar/sidebar-container';
import { SidebarFooter } from '../sidebar/sidebar-footer';
import { SidebarHeader } from '../sidebar/sidebar-header';
import { SidebarTheme } from '../sidebar/sidebar-theme';
import { BannerEmbed } from './components/banner-embed';
import { BannerEmbedPlacementSelect } from './components/banner-embed-placement';
import { BannerSettings } from './components/banner-settings';
import { BannerLayout } from './components/banner-layout';
import { BannerZIndex } from './components/banner-zindex';

const BannerBuilderBody = () => {
  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full ">
        <div className="flex flex-col space-y-3 p-4">
          <SidebarTheme />
          <BannerEmbedPlacementSelect />
          <BannerZIndex />
          <BannerLayout />
          <BannerSettings />
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const BannerBuilderHeader = () => {
  const { currentContent } = useBuilderContext();
  return (
    <CardHeader className="flex-none p-4 space-y-3">
      <CardTitle className="flex h-8">
        <SidebarHeader title={currentContent?.name ?? ''} />
      </CardTitle>
    </CardHeader>
  );
};

const BannerBuilderFooter = () => {
  const { isLoading, onSaved } = useBuilderContext();
  const { flushSave } = useBannerContext();

  const handleSave = async () => {
    await flushSave();
    await onSaved?.();
  };

  return (
    <CardFooter className="flex p-5">
      <SidebarFooter onSave={handleSave} isLoading={isLoading} />
    </CardFooter>
  );
};

export const BannerBuilder = () => {
  return (
    <>
      <SidebarContainer>
        <BannerBuilderHeader />
        <BannerBuilderBody />
        <BannerBuilderFooter />
      </SidebarContainer>
      <BannerEmbed />
    </>
  );
};

BannerBuilder.displayName = 'BannerBuilder';
