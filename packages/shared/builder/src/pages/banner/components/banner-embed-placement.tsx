'use client';

import { BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT, BannerEmbedPlacement } from '@usertour/types';
import type { ElementSelectorPropsData } from '@usertour/types';
import { useCallback } from 'react';

import { EXTENSION_SELECT } from '@usertour-packages/constants';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';

import { ContentPlacementProvider } from '../../../components/content-placement';
import { ContentPlacementManual } from '../../../components/content-placement/content-placement-manual';
import { useBuilderContext, useBannerContext } from '../../../contexts';

const EMBED_PLACEMENT_OPTIONS: { value: BannerEmbedPlacement; label: string }[] = [
  { value: BannerEmbedPlacement.TOP_OF_PAGE, label: 'Top of page' },
  { value: BannerEmbedPlacement.BOTTOM_OF_PAGE, label: 'Bottom of page' },
  { value: BannerEmbedPlacement.TOP_OF_CONTAINER_ELEMENT, label: 'Top of container element' },
  {
    value: BannerEmbedPlacement.BOTTOM_OF_CONTAINER_ELEMENT,
    label: 'Bottom of container element',
  },
  {
    value: BannerEmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT,
    label: 'Immediately before element',
  },
  {
    value: BannerEmbedPlacement.IMMEDIATELY_AFTER_ELEMENT,
    label: 'Immediately after element',
  },
];

const labelStyles = 'flex justify-start items-center space-x-1';

export const BannerEmbedPlacementSelect = () => {
  const { zIndex, isShowError, isWebBuilder, currentContent } = useBuilderContext();
  const { localData, updateLocalData } = useBannerContext();

  const handleTargetChange = useCallback(
    (value: Partial<ElementSelectorPropsData>) => {
      updateLocalData({
        containerElement: { ...localData?.containerElement, ...value },
      });
    },
    [localData?.containerElement, updateLocalData],
  );

  if (!localData) {
    return null;
  }

  const requiresElement = BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT.includes(
    localData.embedPlacement,
  );

  return (
    <div className="space-y-3">
      <div className={labelStyles}>
        <span className="text-sm">Embed placement</span>
        <QuestionTooltip>
          Where the banner is inserted on the page or relative to a container element.
        </QuestionTooltip>
      </div>
      <Select
        value={localData.embedPlacement}
        onValueChange={(value) =>
          updateLocalData({ embedPlacement: value as BannerEmbedPlacement })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Select placement" />
        </SelectTrigger>
        <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
          <SelectContent>
            <SelectGroup>
              {EMBED_PLACEMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
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
          isWebBuilder={isWebBuilder}
          subTitle="Container element for banner"
        >
          <div className="flex flex-col bg-background-700 p-3.5 rounded-lg space-y-6 mt-2">
            <ContentPlacementManual />
          </div>
        </ContentPlacementProvider>
      )}
    </div>
  );
};

BannerEmbedPlacementSelect.displayName = 'BannerEmbedPlacementSelect';
