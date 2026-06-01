'use client';

import { CardContent, ScrollArea } from '@usertour/ui';

import { useSidebarSave } from '../../hooks/use-sidebar-save';
import { BuilderSidebarLayout } from '../sidebar/builder-sidebar-layout';
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

export const BannerBuilder = () => {
  const handleSave = useSidebarSave();
  return (
    <>
      <BuilderSidebarLayout onSave={handleSave}>
        <BannerBuilderBody />
      </BuilderSidebarLayout>
      <BannerEmbed />
    </>
  );
};

BannerBuilder.displayName = 'BannerBuilder';
