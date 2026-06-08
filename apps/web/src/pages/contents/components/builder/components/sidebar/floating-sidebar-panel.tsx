'use client';

import { BUILDER_Z } from '@usertour/constants';
import { RiMenuFoldLine, RiMenuUnfoldLine } from '@usertour/icons';
import { Card } from '@usertour/ui';
import { cn } from '@usertour/tailwind';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { SidebarControls } from '@/pages/contents/components/builder/components/sidebar/sidebar-controls';

export interface FloatingSidebarPanelProps {
  // Panel width in px. Most views share one width; a denser view (e.g. flow's
  // trigger editor) can pass a wider value and the change animates.
  width: number;
  children: ReactNode;
}

// The floating builder panel chrome shared by every content type: a rounded
// card lifted off the canvas edge, with side-switch + collapse controls and a
// width that transitions when it changes. Collapse / side live in the builder
// store, so the fold and the docked edge persist across sub-view navigation
// and are consistent across types.
export const FloatingSidebarPanel = (props: FloatingSidebarPanelProps) => {
  const { width, children } = props;
  const position = useBuilderStore((state) => state.position);
  const setPosition = useBuilderStore((state) => state.setPosition);
  const collapsed = useBuilderStore((state) => state.collapsed);
  const setCollapsed = useBuilderStore((state) => state.setCollapsed);
  const { t } = useTranslation();
  const isLeft = position === 'left';

  return (
    <>
      <div
        style={{ zIndex: BUILDER_Z.panel, width }}
        className={cn(
          'fixed top-[18px] bottom-[18px] transition-all duration-300 ease-in-out',
          isLeft ? 'left-[18px]' : 'right-[18px]',
          collapsed && (isLeft ? '-translate-x-[460px]' : 'translate-x-[460px]'),
        )}
      >
        <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-[0_18px_50px_rgba(15,23,42,0.14)] dark:bg-card dark:shadow-[0_24px_64px_-8px_rgba(0,0,0,0.7)]">
          <div className="absolute right-3 top-3.5 z-10">
            <SidebarControls
              isLeft={isLeft}
              onSwitchSide={() => setPosition(isLeft ? 'right' : 'left')}
              onCollapse={() => setCollapsed(true)}
            />
          </div>
          {children}
        </Card>
      </div>
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={{ zIndex: BUILDER_Z.panel }}
          title={t('contentBuilder.common.expandPanel')}
          className={cn(
            'fixed top-[22px] grid size-9 place-items-center rounded-xl border border-border bg-background text-muted-foreground shadow-[0_6px_16px_rgba(15,23,42,0.08)] hover:bg-muted hover:text-foreground dark:bg-card dark:shadow-[0_10px_24px_-6px_rgba(0,0,0,0.6)]',
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
FloatingSidebarPanel.displayName = 'FloatingSidebarPanel';
