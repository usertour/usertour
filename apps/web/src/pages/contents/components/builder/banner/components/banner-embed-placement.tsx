'use client';

import { BUILDER_Z } from '@usertour/constants';
import { BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT, BannerEmbedPlacement } from '@usertour/types';
import type { ElementSelectorPropsData } from '@usertour/types';
import { useCallback } from 'react';
import { CompactSelect } from '@usertour/ui';
import { useTranslation } from 'react-i18next';

import { ContentPlacementProvider } from '@/pages/contents/components/builder/components/content-placement';
import { ContentPlacementManual } from '@/pages/contents/components/builder/components/content-placement/content-placement-manual';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { useBannerEditor } from '@/pages/contents/components/builder/banner/use-banner-editor';
import { FieldSection, SurfaceCard } from '@usertour/ui';

const PLACEMENT_OPTIONS: { value: BannerEmbedPlacement; i18n: string }[] = [
  { value: BannerEmbedPlacement.TOP_OF_PAGE, i18n: 'topOfPage' },
  { value: BannerEmbedPlacement.BOTTOM_OF_PAGE, i18n: 'bottomOfPage' },
  { value: BannerEmbedPlacement.TOP_OF_CONTAINER_ELEMENT, i18n: 'topOfContainer' },
  { value: BannerEmbedPlacement.BOTTOM_OF_CONTAINER_ELEMENT, i18n: 'bottomOfContainer' },
  { value: BannerEmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT, i18n: 'beforeElement' },
  { value: BannerEmbedPlacement.IMMEDIATELY_AFTER_ELEMENT, i18n: 'afterElement' },
];

export const BannerEmbedPlacementSelect = () => {
  const isShowError = useBuilderStore((state) => state.isShowError);
  const currentContent = useBuilderStore((state) => state.currentContent);
  const { data: localData, updateData: updateLocalData } = useBannerEditor();
  const { t } = useTranslation();

  const handleTargetChange = useCallback(
    (value: Partial<ElementSelectorPropsData>) => {
      const nextContainer = { ...localData.containerElement, ...value };
      let nextType = nextContainer.type;

      if (!nextType) {
        if (value.customSelector) {
          nextType = 'manual';
        } else if (value.selectors) {
          nextType = 'auto';
        }
      }

      updateLocalData({
        containerElement: nextType ? { ...nextContainer, type: nextType } : nextContainer,
      });
    },
    [localData.containerElement, updateLocalData],
  );

  const requiresElement = BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT.includes(
    localData.embedPlacement,
  );

  return (
    <FieldSection
      title={t('contentBuilder.banner.embedPlacement')}
      tooltip={t('contentBuilder.banner.embedPlacementTooltip')}
    >
      <CompactSelect
        options={PLACEMENT_OPTIONS.map((opt) => ({
          value: opt.value,
          label: t(`contentBuilder.banner.placement.${opt.i18n}`),
        }))}
        value={localData.embedPlacement}
        onChange={(value) => updateLocalData({ embedPlacement: value as BannerEmbedPlacement })}
        placeholder={t('contentBuilder.banner.selectPlacement')}
        className="w-full bg-surface dark:bg-surface-raised/50 shadow-none"
        contentStyle={{ zIndex: BUILDER_Z.popover }}
      />
      {requiresElement && (
        <ContentPlacementProvider
          isShowError={isShowError}
          target={localData.containerElement}
          onTargetChange={handleTargetChange}
          buildUrl={currentContent?.buildUrl}
          subTitle={t('contentBuilder.banner.containerElementSubtitle')}
        >
          <SurfaceCard className="flex flex-col space-y-6 mt-2">
            <ContentPlacementManual />
          </SurfaceCard>
        </ContentPlacementProvider>
      )}
    </FieldSection>
  );
};

BannerEmbedPlacementSelect.displayName = 'BannerEmbedPlacementSelect';
