'use client';

import { CardContent, CardFooter, CardHeader, CardTitle, ScrollArea } from '@usertour/ui';

import { useBuilderConfig, useBuilderMethods, useBuilderStore } from '../../contexts';
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
  const currentContent = useBuilderStore((state) => state.currentContent);
  return (
    <CardHeader className="flex-none p-4 space-y-3">
      <CardTitle className="flex h-8">
        <SidebarHeader title={currentContent?.name ?? ''} />
      </CardTitle>
    </CardHeader>
  );
};

const BannerBuilderFooter = () => {
  // isLoading merges initial-content load + save-in-flight (legacy
  // overload). Per docs/conventions/builder-context-migration.md.
  const isLoading = useBuilderStore(
    (state) => state.isLoading || state.saveState.status === 'saving',
  );
  const { onSaved } = useBuilderConfig();
  const { saveContent } = useBuilderMethods();

  const handleSave = async () => {
    // saveContent is idempotent — bails if not dirty — and awaits the
    // dispatched mutations + the post-save fetchContentAndVersion
    // before resolving. After it returns, currentVersion = backupVersion
    // and onSaved can navigate away cleanly.
    await saveContent();
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
