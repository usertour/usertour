'use client';

import { BUILDER_Z } from '@usertour/constants';
import { EmbedPlacement } from '@usertour/types';
import type { ElementSelectorPropsData, EmbedOuterMargin } from '@usertour/types';
import { useCallback } from 'react';
import {
  BooleanField,
  CompactSelect,
  FieldCard,
  FieldSection,
  Input,
  Label,
  QuestionTooltip,
  SurfaceCard,
} from '@usertour/ui';
import { useTranslation } from 'react-i18next';

import { ContentPlacementProvider } from '@/pages/contents/components/builder/components/content-placement';
import { ContentPlacementManual } from '@/pages/contents/components/builder/components/content-placement/content-placement-manual';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { useEmbedEditor } from '@/pages/contents/components/builder/embed/use-embed-editor';

const PLACEMENT_OPTIONS: { value: EmbedPlacement; i18n: string }[] = [
  { value: EmbedPlacement.TOP_OF_CONTAINER_ELEMENT, i18n: 'topOfContainer' },
  { value: EmbedPlacement.BOTTOM_OF_CONTAINER_ELEMENT, i18n: 'bottomOfContainer' },
  { value: EmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT, i18n: 'beforeElement' },
  { value: EmbedPlacement.IMMEDIATELY_AFTER_ELEMENT, i18n: 'afterElement' },
  { value: EmbedPlacement.COVER_ELEMENT, i18n: 'coverElement' },
];

// Placement + target element. Every embed placement is element-relative, so
// the target picker is always shown.
export const EmbedPlacementSelect = () => {
  const isShowError = useBuilderStore((state) => state.isShowError);
  const currentContent = useBuilderStore((state) => state.currentContent);
  const { data: localData, updateData: updateLocalData } = useEmbedEditor();
  const { t } = useTranslation();

  const handleTargetChange = useCallback(
    (value: Partial<ElementSelectorPropsData>) => {
      const nextTarget = { ...localData.targetElement, ...value };
      let nextType = nextTarget.type;
      if (!nextType) {
        if (value.customSelector) {
          nextType = 'manual';
        } else if (value.selectors) {
          nextType = 'auto';
        }
      }
      updateLocalData({
        targetElement: nextType ? { ...nextTarget, type: nextType } : nextTarget,
      });
    },
    [localData.targetElement, updateLocalData],
  );

  return (
    <FieldSection
      title={t('contentBuilder.embed.placement')}
      tooltip={t('contentBuilder.embed.placementTooltip')}
    >
      <CompactSelect
        options={PLACEMENT_OPTIONS.map((option) => ({
          value: option.value,
          label: t(`contentBuilder.embed.placementOptions.${option.i18n}`),
        }))}
        value={localData.placement}
        onChange={(value) => updateLocalData({ placement: value as EmbedPlacement })}
        placeholder={t('contentBuilder.embed.selectPlacement')}
        className="w-full bg-surface dark:bg-surface-raised/50 shadow-none"
        contentStyle={{ zIndex: BUILDER_Z.popover }}
      />
      <ContentPlacementProvider
        isShowError={isShowError}
        target={localData.targetElement}
        onTargetChange={handleTargetChange}
        buildUrl={currentContent?.buildUrl}
        subTitle={t('contentBuilder.embed.targetElementSubtitle')}
      >
        <SurfaceCard className="flex flex-col space-y-6 mt-2">
          <ContentPlacementManual />
        </SurfaceCard>
      </ContentPlacementProvider>
    </FieldSection>
  );
};

EmbedPlacementSelect.displayName = 'EmbedPlacementSelect';

export const EmbedZIndex = () => {
  const { data: localData, updateData: updateLocalData } = useEmbedEditor();
  const { t } = useTranslation();

  return (
    <FieldSection title={t('contentBuilder.embed.zIndex')}>
      <Input
        variant="compact-muted"
        className="bg-surface dark:bg-surface-raised/50 shadow-none"
        type="number"
        min={0}
        value={localData.zIndex ?? ''}
        placeholder={t('contentBuilder.common.default')}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          updateLocalData({ zIndex: Number.isNaN(parsed) ? undefined : Math.max(0, parsed) });
        }}
      />
    </FieldSection>
  );
};

EmbedZIndex.displayName = 'EmbedZIndex';

const defaultMargin: EmbedOuterMargin = { top: 0, right: 0, bottom: 0, left: 0 };

const MARGIN_SIDES: readonly (keyof EmbedOuterMargin)[] = ['top', 'right', 'bottom', 'left'];

export const EmbedLayout = () => {
  const { data: localData, updateData: updateLocalData } = useEmbedEditor();
  const { t } = useTranslation();

  const handleMaxContentWidthChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (value === '') {
        updateLocalData({ maxContentWidth: undefined });
        return;
      }
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        updateLocalData({ maxContentWidth: Math.max(0, parsed) });
      }
    },
    [updateLocalData],
  );

  const handleMarginChange = useCallback(
    (side: keyof EmbedOuterMargin, value: string) => {
      const parsed = value === '' ? 0 : Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) {
        return;
      }
      const current = localData.outerMargin ?? defaultMargin;
      updateLocalData({ outerMargin: { ...current, [side]: Math.max(0, parsed) } });
    },
    [localData.outerMargin, updateLocalData],
  );

  const margin = localData.outerMargin ?? defaultMargin;

  const marginInput = (side: keyof EmbedOuterMargin) => (
    <Input
      variant="compact"
      id={`embed-margin-${side}`}
      type="text"
      inputMode="numeric"
      value={margin[side]}
      placeholder={t(`contentBuilder.embed.margin.${side}`)}
      onChange={(event) => handleMarginChange(side, event.target.value)}
      className="w-20 flex-none"
    />
  );

  return (
    <FieldSection title={t('contentBuilder.embed.layout')}>
      <SurfaceCard className="flex flex-col space-y-3">
        <div className="space-y-2">
          <div className="flex items-center space-x-1">
            <Label htmlFor="embed-max-content-width" className="font-normal text-sm">
              {t('contentBuilder.embed.maxContentWidth')}
            </Label>
            <QuestionTooltip>{t('contentBuilder.embed.maxContentWidthTooltip')}</QuestionTooltip>
          </div>
          <div className="relative">
            <Input
              variant="compact"
              id="embed-max-content-width"
              type="text"
              inputMode="numeric"
              value={localData.maxContentWidth ?? ''}
              placeholder={t('contentBuilder.embed.none')}
              onChange={handleMaxContentWidthChange}
              className="pe-9"
            />
            <span className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground text-sm">
              px
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-1">
            <Label className="font-normal text-sm">{t('contentBuilder.embed.outerMargin')}</Label>
            <QuestionTooltip>{t('contentBuilder.embed.outerMarginTooltip')}</QuestionTooltip>
          </div>
          <div className="flex gap-x-2">
            <div className="flex flex-col justify-center">{marginInput(MARGIN_SIDES[3])}</div>
            <div className="flex flex-col justify-center gap-y-2">
              {marginInput(MARGIN_SIDES[0])}
              {marginInput(MARGIN_SIDES[2])}
            </div>
            <div className="flex flex-col justify-center">{marginInput(MARGIN_SIDES[1])}</div>
          </div>
        </div>
      </SurfaceCard>
    </FieldSection>
  );
};

EmbedLayout.displayName = 'EmbedLayout';

export const EmbedSettings = () => {
  const { data: localData, updateData: updateLocalData } = useEmbedEditor();
  const { t } = useTranslation();

  return (
    <FieldCard title={t('contentBuilder.embed.settings')}>
      <BooleanField
        label={t('contentBuilder.embed.allowDismiss')}
        tooltip={t('contentBuilder.embed.allowDismissTooltip')}
        checked={localData.allowUsersToDismiss}
        onChange={(checked) => updateLocalData({ allowUsersToDismiss: checked })}
      />
    </FieldCard>
  );
};

EmbedSettings.displayName = 'EmbedSettings';
