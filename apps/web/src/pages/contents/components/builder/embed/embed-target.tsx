'use client';

import { EmbedPlacement } from '@usertour/types';
import type { ElementSelectorPropsData } from '@usertour/types';
import { useCallback, useLayoutEffect } from 'react';
import {
  Button,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  FieldSection,
  Input,
  Label,
  QuestionTooltip,
  ScrollArea,
  SurfaceCard,
} from '@usertour/ui';
import { RiArrowLeftSLine, SpinnerIcon } from '@usertour/icons';
import { useTranslation } from 'react-i18next';

import { ContentPlacementProvider } from '@/pages/contents/components/builder/components/content-placement';
import { ContentPlacementManual } from '@/pages/contents/components/builder/components/content-placement/content-placement-manual';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { useEmbedEditor } from '@/pages/contents/components/builder/embed/use-embed-editor';

// The target sub-view: the shell's target element and, for the cover
// placement, its z-index, edited as a draft and written back on Save. The
// overview keeps the placement select and a one-row summary of the target
// that opens this view. Same shape as the launcher's target sub-view.

const EmbedTargetHeader = () => {
  const { backToOverview, setTargetDraft } = useEmbedEditor();
  const { t } = useTranslation();

  const handleBack = () => {
    backToOverview();
    setTargetDraft(undefined);
  };

  return (
    <CardHeader className="flex-none border-b border-border/50 px-5 py-4">
      <CardTitle className="flex flex-row space-x-1 text-base font-medium items-center pr-16">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="mr-1.5 size-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RiArrowLeftSLine className="h-5 w-5" />
        </Button>
        <span className="truncate">{t('contentBuilder.embed.targetSettings')}</span>
      </CardTitle>
    </CardHeader>
  );
};

const EmbedTargetBody = () => {
  const isShowError = useBuilderStore((state) => state.isShowError);
  const currentContent = useBuilderStore((state) => state.currentContent);
  const { data, targetDraft, setTargetDraft } = useEmbedEditor();
  const { t } = useTranslation();

  const handleTargetChange = useCallback(
    (value: Partial<ElementSelectorPropsData>) => {
      setTargetDraft((previous) => {
        if (!previous) {
          return previous;
        }
        const nextTarget = { ...previous.targetElement, ...value };
        let nextType = nextTarget.type;
        if (!nextType) {
          if (value.customSelector) {
            nextType = 'manual';
          } else if (value.selectors) {
            nextType = 'auto';
          }
        }
        return {
          ...previous,
          targetElement: nextType ? { ...nextTarget, type: nextType } : nextTarget,
        };
      });
    },
    [setTargetDraft],
  );

  const handleZIndexChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = Number.parseInt(event.target.value, 10);
      setTargetDraft((previous) =>
        previous
          ? { ...previous, zIndex: Number.isNaN(parsed) ? undefined : Math.max(0, parsed) }
          : previous,
      );
    },
    [setTargetDraft],
  );

  if (!targetDraft) {
    return null;
  }

  // Only the cover placement positions the shell itself (fixed over the
  // target), so only there does a z-index do anything; the in-flow placements
  // insert the shell into the host's document flow.
  const isCover = data.placement === EmbedPlacement.COVER_ELEMENT;

  return (
    <CardContent className="grow overflow-hidden p-0">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-4 p-3">
          <ContentPlacementProvider
            isShowError={isShowError}
            target={targetDraft.targetElement}
            onTargetChange={handleTargetChange}
            buildUrl={currentContent?.buildUrl}
          >
            <FieldSection title={t('contentBuilder.embed.targetElement')}>
              <SurfaceCard className="flex flex-col space-y-6">
                <ContentPlacementManual />
                {isCover && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1">
                      <Label htmlFor="embed-cover-z-index" className="font-normal text-sm">
                        {t('contentBuilder.embed.zIndex')}
                      </Label>
                      <QuestionTooltip>{t('contentBuilder.embed.zIndexTooltip')}</QuestionTooltip>
                    </div>
                    <Input
                      variant="compact"
                      id="embed-cover-z-index"
                      type="number"
                      min={0}
                      value={targetDraft.zIndex ?? ''}
                      placeholder={t('contentBuilder.common.default')}
                      onChange={handleZIndexChange}
                    />
                  </div>
                )}
              </SurfaceCard>
            </FieldSection>
          </ContentPlacementProvider>
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const EmbedTargetFooter = () => {
  const { isLoading, targetDraft, updateData, backToOverview, setTargetDraft } = useEmbedEditor();
  const { t } = useTranslation();

  const handleSave = useCallback(() => {
    if (targetDraft) {
      updateData({ targetElement: targetDraft.targetElement, zIndex: targetDraft.zIndex });
    }
    backToOverview();
    setTargetDraft(undefined);
  }, [targetDraft, updateData, backToOverview, setTargetDraft]);

  return (
    <CardFooter className="flex-none border-t border-border/50 p-4">
      <Button className="w-full h-10" disabled={isLoading} onClick={handleSave}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        {t('contentBuilder.common.save')}
      </Button>
    </CardFooter>
  );
};

// Rendered into the persistent panel layout, like the step detail. Seeds the
// draft from the shell when it mounts, so navigation, deep link and refresh
// all land on a populated panel; a layout effect because the body gates on
// the draft and seeding after paint would flash a blank frame.
export const EmbedTarget = () => {
  const { data, setTargetDraft } = useEmbedEditor();
  useLayoutEffect(() => {
    setTargetDraft({ targetElement: data.targetElement, zIndex: data.zIndex });
  }, []);

  return (
    <>
      <EmbedTargetHeader />
      <EmbedTargetBody />
      <EmbedTargetFooter />
    </>
  );
};

EmbedTarget.displayName = 'EmbedTarget';
