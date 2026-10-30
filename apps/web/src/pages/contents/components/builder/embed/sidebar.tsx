'use client';

import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  FieldSection,
  ScrollArea,
} from '@usertour/ui';
import { StepContentType } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { useSidebarSave } from '@/pages/contents/components/builder/hooks/use-sidebar-save';
import { SidebarContents } from '@/pages/contents/components/builder/flow/sidebar-contents';
import { SidebarCreate } from '@/pages/contents/components/builder/flow/sidebar-create';
import { SidebarFooter } from '@/pages/contents/components/builder/components/sidebar/sidebar-footer';
import { SidebarHeader } from '@/pages/contents/components/builder/components/sidebar/sidebar-header';
import { SidebarTheme } from '@/pages/contents/components/builder/components/sidebar/sidebar-theme';
import {
  EmbedLayout,
  EmbedPlacementSelect,
  EmbedSettings,
} from '@/pages/contents/components/builder/embed/components/embed-settings';

// Overview content, in the checklist sidebar's order: theme; placement, the
// shell's identity, kept first so the required target's row stays in view;
// the steps, where the work happens; then the rest of the shell (layout /
// dismiss), set once. Rendered into the persistent panel layout.
export const EmbedSideBar = () => {
  const currentContent = useBuilderStore((state) => state.currentContent);
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const { t } = useTranslation();

  const handleSave = useSidebarSave();

  return (
    <>
      <CardHeader className="flex-none border-b border-border/50 px-5 py-4">
        <CardTitle className="flex h-7 items-center pr-16 text-base font-medium">
          <SidebarHeader title={currentContent?.name ?? ''} />
        </CardTitle>
      </CardHeader>
      <CardContent className="grow overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-4 p-3">
            <SidebarTheme />
            <EmbedPlacementSelect />
            <FieldSection title={t('contentBuilder.embed.steps')}>
              {currentVersion?.steps && currentVersion.steps.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  <SidebarContents />
                </div>
              )}
              <SidebarCreate defaultType={StepContentType.INLINE} />
            </FieldSection>
            <EmbedLayout />
            <EmbedSettings />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex-none border-t border-border/50 p-4">
        <SidebarFooter onSave={handleSave} />
      </CardFooter>
    </>
  );
};

EmbedSideBar.displayName = 'EmbedSideBar';
