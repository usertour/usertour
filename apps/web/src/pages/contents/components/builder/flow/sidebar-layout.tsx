'use client';

import { Card } from '@usertour/ui';
import { EXTENSION_CONTENT_SIDEBAR } from '@usertour/constants';
import { RiMenuFoldLine, RiMenuUnfoldLine } from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router-dom';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { SidebarControls } from '@/pages/contents/components/builder/flow/sidebar-controls';

// Persistent floating panel for every flow sub-view, used as a React Router
// layout route: it stays mounted while the matched child route renders into
// <Outlet/>, so the panel width and inner content transition smoothly instead
// of the whole panel being swapped on navigation. Side switch / collapse live
// here once rather than being duplicated per view.
export const FlowSidebarLayout = () => {
  const position = useBuilderStore((state) => state.position);
  const setPosition = useBuilderStore((state) => state.setPosition);
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isLeft = position === 'left';
  // Trigger editing is denser (condition / action chips) so it gets a touch
  // more width; the other views use the standard panel width.
  const width = pathname.includes('/trigger/') ? 360 : 312;

  return (
    <>
      <div
        style={{ zIndex: EXTENSION_CONTENT_SIDEBAR, width }}
        className={cn(
          'fixed top-[18px] bottom-[18px] transition-all duration-300 ease-in-out',
          isLeft ? 'left-[18px]' : 'right-[18px]',
          collapsed && (isLeft ? '-translate-x-[460px]' : 'translate-x-[460px]'),
        )}
      >
        <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background-900 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
          <div className="absolute right-3 top-3.5 z-10">
            <SidebarControls
              isLeft={isLeft}
              onSwitchSide={() => setPosition(isLeft ? 'right' : 'left')}
              onCollapse={() => setCollapsed(true)}
            />
          </div>
          <Outlet />
        </Card>
      </div>
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={{ zIndex: EXTENSION_CONTENT_SIDEBAR }}
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
FlowSidebarLayout.displayName = 'FlowSidebarLayout';
