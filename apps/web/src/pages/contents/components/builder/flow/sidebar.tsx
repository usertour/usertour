'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, ScrollArea } from '@usertour/ui';
import { EXTENSION_SIDEBAR_MAIN } from '@usertour/constants';
import { RiMenuFoldLine, RiMenuUnfoldLine } from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useBuilderConfig,
  useBuilderStore,
  useIsBusy,
} from '@/pages/contents/components/builder/core';
import { useSidebarSave } from '@/pages/contents/components/builder/hooks/use-sidebar-save';
import { SidebarContents } from '@/pages/contents/components/builder/flow/sidebar-contents';
import { SidebarControls } from '@/pages/contents/components/builder/flow/sidebar-controls';
import { SidebarCreate } from '@/pages/contents/components/builder/flow/sidebar-create';
import { SidebarFooter } from '@/pages/contents/components/builder/components/sidebar/sidebar-footer';
import { SidebarHeader } from '@/pages/contents/components/builder/components/sidebar/sidebar-header';
import { SidebarTheme } from '@/pages/contents/components/builder/components/sidebar/sidebar-theme';

export const BuilderSideBar = () => {
  const { zIndex } = useBuilderConfig();
  const position = useBuilderStore((state) => state.position);
  const setPosition = useBuilderStore((state) => state.setPosition);
  const currentContent = useBuilderStore((state) => state.currentContent);
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const isLoading = useIsBusy();
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useTranslation();

  const handleSave = useSidebarSave();
  const isLeft = position === 'left';

  return (
    <>
      <div
        style={{ zIndex: zIndex + EXTENSION_SIDEBAR_MAIN }}
        className={cn(
          'fixed top-[18px] bottom-[18px] w-[312px] transition-transform duration-300 ease-in-out',
          isLeft ? 'left-[18px]' : 'right-[18px]',
          collapsed && (isLeft ? '-translate-x-[420px]' : 'translate-x-[420px]'),
        )}
      >
        <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background-900 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
          <CardHeader className="flex-none border-b border-border/50 px-5 py-4">
            <CardTitle className="flex h-7 items-center gap-2 text-base font-semibold">
              <SidebarHeader title={currentContent?.name ?? ''} />
              <SidebarControls
                isLeft={isLeft}
                onSwitchSide={() => setPosition(isLeft ? 'right' : 'left')}
                onCollapse={() => setCollapsed(true)}
              />
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
        </Card>
      </div>
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={{ zIndex: zIndex + EXTENSION_SIDEBAR_MAIN }}
          title={t('contentBuilder.common.expandPanel')}
          className={cn(
            'fixed top-[22px] grid size-9 place-items-center rounded-xl border border-border bg-background-900 text-muted-foreground shadow-[0_6px_16px_rgba(15,23,42,0.08)] hover:bg-muted hover:text-foreground',
            isLeft ? 'left-[18px]' : 'right-[18px]',
          )}
        >
          {isLeft ? (
            <RiMenuUnfoldLine className="h-[18px] w-[18px]" />
          ) : (
            <RiMenuFoldLine className="h-[18px] w-[18px]" />
          )}
        </button>
      )}
    </>
  );
};

BuilderSideBar.displayName = 'BuilderSideBar';
