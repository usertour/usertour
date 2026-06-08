'use client';

import type { BannerOuterMargin } from '@usertour/types';
import { useCallback } from 'react';

import { Input, Label, QuestionTooltip } from '@usertour/ui';
import { useTranslation } from 'react-i18next';

import { useBannerEditor } from '@/pages/contents/components/builder/banner/use-banner-editor';
import { FieldSection } from '@usertour/ui';

const defaultMargin: BannerOuterMargin = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const NUMBER_FIELDS = ['maxEmbedWidth', 'maxContentWidth', 'borderRadius'] as const;

export const BannerLayout = () => {
  const { data: localData, updateData: updateLocalData } = useBannerEditor();
  const { t } = useTranslation();

  const handleNumberChange = useCallback(
    (key: (typeof NUMBER_FIELDS)[number]) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === '') {
        updateLocalData({ [key]: undefined });
        return;
      }
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        // Widths / radius are non-negative.
        updateLocalData({ [key]: Math.max(0, parsed) });
      }
    },
    [updateLocalData],
  );

  const handleMarginChange = useCallback(
    (side: keyof BannerOuterMargin, value: string) => {
      const parsed = value === '' ? 0 : Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) {
        return;
      }
      const current = localData.outerMargin ?? defaultMargin;
      const next: BannerOuterMargin = { ...current, [side]: Math.max(0, parsed) };
      updateLocalData({ outerMargin: next });
    },
    [localData.outerMargin, updateLocalData],
  );

  const margin = localData.outerMargin ?? defaultMargin;

  const marginInput = (side: keyof BannerOuterMargin) => (
    <Input
      variant="compact"
      id={`margin-${side}`}
      type="text"
      inputMode="numeric"
      value={margin[side]}
      placeholder={t(`contentBuilder.banner.margin${side.charAt(0).toUpperCase()}${side.slice(1)}`)}
      onChange={(e) => handleMarginChange(side, e.target.value)}
      className="w-20 flex-none"
    />
  );

  return (
    <FieldSection title={t('contentBuilder.banner.layout')}>
      <div className="flex flex-col bg-surface p-3.5 rounded-lg space-y-3">
        {NUMBER_FIELDS.map((key) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center space-x-1">
              <Label htmlFor={key} className="font-normal text-sm">
                {t(`contentBuilder.banner.${key}`)}
              </Label>
              <QuestionTooltip>{t(`contentBuilder.banner.${key}Tooltip`)}</QuestionTooltip>
            </div>
            <div className="relative">
              <Input
                variant="compact"
                id={key}
                type="text"
                inputMode="numeric"
                value={localData[key] ?? ''}
                placeholder={t('contentBuilder.banner.none')}
                onChange={handleNumberChange(key)}
                className="pe-9"
              />
              <span className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground text-sm">
                px
              </span>
            </div>
          </div>
        ))}
        <div className="space-y-2">
          <div className="flex items-center space-x-1">
            <Label className="font-normal text-sm">{t('contentBuilder.banner.outerMargin')}</Label>
            <QuestionTooltip>{t('contentBuilder.banner.outerMarginTooltip')}</QuestionTooltip>
          </div>
          <div className="flex gap-x-2">
            <div className="flex flex-col justify-center">{marginInput('left')}</div>
            <div className="flex flex-col justify-center gap-y-2">
              {marginInput('top')}
              {marginInput('bottom')}
            </div>
            <div className="flex flex-col justify-center">{marginInput('right')}</div>
          </div>
        </div>
      </div>
    </FieldSection>
  );
};

BannerLayout.displayName = 'BannerLayout';
