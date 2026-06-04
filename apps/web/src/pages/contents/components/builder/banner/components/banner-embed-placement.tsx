'use client';

import { BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT, BannerEmbedPlacement } from '@usertour/types';
import type { ElementSelectorPropsData } from '@usertour/types';
import { useCallback } from 'react';

import { EXTENSION_SELECT } from '@usertour/constants';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour/ui';
import { useTranslation } from 'react-i18next';

import { ContentPlacementProvider } from '@/pages/contents/components/builder/components/content-placement';
import { ContentPlacementManual } from '@/pages/contents/components/builder/components/content-placement/content-placement-manual';
import { useBuilderConfig, useBuilderStore } from '@/pages/contents/components/builder/core';
import { useBannerEditor } from '@/pages/contents/components/builder/banner/use-banner-editor';
import { FieldSection } from '@/pages/contents/components/builder/shared/fields';

const PLACEMENT_OPTIONS: { value: BannerEmbedPlacement; i18n: string }[] = [
  { value: BannerEmbedPlacement.TOP_OF_PAGE, i18n: 'topOfPage' },
  { value: BannerEmbedPlacement.BOTTOM_OF_PAGE, i18n: 'bottomOfPage' },
  { value: BannerEmbedPlacement.TOP_OF_CONTAINER_ELEMENT, i18n: 'topOfContainer' },
  { value: BannerEmbedPlacement.BOTTOM_OF_CONTAINER_ELEMENT, i18n: 'bottomOfContainer' },
  { value: BannerEmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT, i18n: 'beforeElement' },
  { value: BannerEmbedPlacement.IMMEDIATELY_AFTER_ELEMENT, i18n: 'afterElement' },
];

export const BannerEmbedPlacementSelect = () => {
  const { zIndex } = useBuilderConfig();
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
      <Select
        value={localData.embedPlacement}
        onValueChange={(value) =>
          updateLocalData({ embedPlacement: value as BannerEmbedPlacement })
        }
      >
        <SelectTrigger variant="compact-muted">
          <SelectValue placeholder={t('contentBuilder.banner.selectPlacement')} />
        </SelectTrigger>
        <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
          <SelectContent>
            <SelectGroup>
              {PLACEMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-sm">
                  {t(`contentBuilder.banner.placement.${opt.i18n}`)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </SelectPortal>
      </Select>
      {requiresElement && (
        <ContentPlacementProvider
          isShowError={isShowError}
          zIndex={zIndex}
          target={localData.containerElement}
          onTargetChange={handleTargetChange}
          buildUrl={currentContent?.buildUrl}
          subTitle={t('contentBuilder.banner.containerElementSubtitle')}
        >
          <div className="flex flex-col bg-background-700 p-3.5 rounded-lg space-y-6 mt-2">
            <ContentPlacementManual />
          </div>
        </ContentPlacementProvider>
      )}
    </FieldSection>
  );
};

BannerEmbedPlacementSelect.displayName = 'BannerEmbedPlacementSelect';
