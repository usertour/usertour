'use client';

import { BUILDER_Z } from '@usertour/constants';
import { CONTENT_ACTION_CAPABILITIES } from '@usertour/helpers';
import { ContentEditorSerialize, EmbedPreview, EmbedRoot, InlineContainer } from '@usertour/widget';
import type { ContentEditorRoot, EmbedData, Step } from '@usertour/types';
import { ContentDataType, EmbedPlacement, StepContentType } from '@usertour/types';
import { cn } from '@usertour/tailwind';
import type { ReactNode, Ref } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ContentEditor } from '@/components/editor';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useUpload } from '@/hooks/use-upload';
import { BrowserPreview } from '@/pages/contents/components/builder/banner/components/browser-preview';
import {
  useBuilderContentRef,
  useBuilderStore,
  useProjectId,
} from '@/pages/contents/components/builder/core';
import { useEmbedEditor } from '@/pages/contents/components/builder/embed/use-embed-editor';
import { useFlowEditor } from '@/pages/contents/components/builder/flow/use-flow-editor';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { useCurrentTheme } from '@/pages/contents/components/builder/hooks/use-current-theme';
import { useOembedInfo } from '@/pages/contents/components/builder/hooks/use-oembed-info';
import { getStepId } from '@/utils/content';

const ACTION_ITEMS = [...CONTENT_ACTION_CAPABILITIES[ContentDataType.EMBED].actions];

interface PlacementPreviewProps {
  placement: EmbedPlacement;
  card: ReactNode;
  targetLabel: string;
}

// The embed sits before / after a stand-in target element, inside it against
// the top / bottom edge, or over it (cover). The target is a dashed block so
// the placement reads at a glance.
const PlacementPreview = (props: PlacementPreviewProps) => {
  const { placement, card, targetLabel } = props;
  const isCover = placement === EmbedPlacement.COVER_ELEMENT;
  return (
    <div className="h-full flex flex-col relative bg-white dark:bg-card">
      <div className="flex-1 overflow-y-auto p-12 pt-20">
        {placement === EmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT && card}
        <div
          className={cn(
            'relative border-2 border-dashed border-blue-400 bg-blue-50 rounded flex flex-col justify-center',
            isCover ? 'min-h-[220px]' : 'min-h-[80px]',
          )}
        >
          {placement === EmbedPlacement.TOP_OF_CONTAINER_ELEMENT && card}
          <p className="text-sm font-medium text-blue-600 p-6 text-center">{targetLabel}</p>
          {placement === EmbedPlacement.BOTTOM_OF_CONTAINER_ELEMENT && card}
          {isCover && <div className="absolute inset-0 flex flex-col overflow-auto">{card}</div>}
        </div>
        {placement === EmbedPlacement.IMMEDIATELY_AFTER_ELEMENT && card}
      </div>
    </div>
  );
};

interface EmbedShellProps {
  data: EmbedData;
  card: ReactNode;
}

// The browser frame with the shell at its placement; the card is whatever the
// caller renders inside the embed's surface (an editor or a read-only step).
const EmbedShell = (props: EmbedShellProps) => {
  const { data, card } = props;
  const theme = useCurrentTheme({ fallbackToDefault: true });
  const { t } = useTranslation();

  const previewData = useMemo(
    () => ({ ...data, zIndex: data.zIndex ?? 10000 + BUILDER_Z.canvas }),
    [data],
  );

  if (!theme) {
    return null;
  }

  return (
    <EmbedRoot themeSettings={theme.settings} data={previewData} zIndex={previewData.zIndex}>
      <InlineContainer>
        <BrowserPreview width={960}>
          <PlacementPreview
            placement={data.placement}
            card={card}
            targetLabel={t('contentBuilder.embed.targetElement')}
          />
        </BrowserPreview>
      </InlineContainer>
    </EmbedRoot>
  );
};

/** The first step a user would see: the first non-hidden step, if any. */
const firstVisibleStep = (steps: Step[] | undefined): Step | undefined =>
  steps?.find((step) => step.type !== StepContentType.HIDDEN);

// Overview canvas: the shell with its first visible step, read-only, so
// placement and layout edits in the sidebar are seen in place.
export const EmbedOverviewCanvas = () => {
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const { data } = useEmbedEditor();
  const step = firstVisibleStep(currentVersion?.steps as Step[] | undefined);

  const card = step ? (
    <EmbedPreview>
      <ContentEditorSerialize contents={step.data as ContentEditorRoot[]} />
    </EmbedPreview>
  ) : (
    <EmbedPreview>
      <div className="min-h-10" />
    </EmbedPreview>
  );

  return <EmbedShell data={data} card={card} />;
};

EmbedOverviewCanvas.displayName = 'EmbedOverviewCanvas';

// Step canvas: the shell with the step being edited inside it. A hidden
// step renders nothing (it shows nothing at runtime either), so only the
// placeholder target remains.
export const EmbedStepCanvas = () => {
  const contentRef = useBuilderContentRef();
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const currentContent = useBuilderStore((state) => state.currentContent);
  const projectId = useProjectId();
  const { currentStep, currentIndex, updateCurrentStep, createNewStep } = useFlowEditor();
  const { data } = useEmbedEditor();
  const { contents } = useContentList();
  const { attributeList } = useAttributeList();
  const { upload } = useUpload();
  const getOembedInfo = useOembedInfo();

  if (!currentStep || !projectId) {
    return null;
  }

  const handleContentChange = (value: ContentEditorRoot[]) => {
    updateCurrentStep((previous) => ({ ...previous, data: value }));
  };

  // Keyed by the step's stable id so the uncontrolled editor re-initializes
  // when the route moves to another step (see FlowBuilderDetailEmbed).
  const stepKey = getStepId(currentStep, currentIndex);

  const card =
    currentStep.type === StepContentType.HIDDEN ? null : (
      <EmbedPreview key={stepKey} ref={contentRef as Ref<HTMLDivElement> | undefined}>
        <ContentEditor
          zIndex={BUILDER_Z.canvas}
          customUploadRequest={upload}
          initialValue={currentStep.data as ContentEditorRoot[]}
          onValueChange={handleContentChange}
          projectId={projectId}
          attributes={attributeList}
          actionItems={ACTION_ITEMS}
          contentList={contents}
          currentContent={currentContent}
          currentVersion={currentVersion}
          currentStep={currentStep}
          getOembedInfo={getOembedInfo}
          createStep={createNewStep}
        />
      </EmbedPreview>
    );

  return <EmbedShell data={data} card={card} />;
};

EmbedStepCanvas.displayName = 'EmbedStepCanvas';
