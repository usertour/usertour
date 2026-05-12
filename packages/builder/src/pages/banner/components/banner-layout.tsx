'use client';

import type { BannerOuterMargin } from '@usertour/types';
import { useCallback } from 'react';

import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { QuestionTooltip } from '@usertour-packages/tooltip';

import { useBannerContext } from '../../../contexts';

const defaultMargin: BannerOuterMargin = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export const BannerLayout = () => {
  const { localData, updateLocalData } = useBannerContext();

  const handleNumberChange = useCallback(
    (key: 'maxEmbedWidth' | 'maxContentWidth' | 'borderRadius') =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
          updateLocalData({ [key]: undefined });
          return;
        }
        const parsed = Number.parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
          updateLocalData({ [key]: parsed });
        }
      },
    [updateLocalData],
  );

  const handleMarginChange = useCallback(
    (side: keyof BannerOuterMargin, value: string) => {
      const parsed = value === '' ? 0 : Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) return;
      const current = localData?.outerMargin ?? defaultMargin;
      const next: BannerOuterMargin = { ...current, [side]: parsed };
      updateLocalData({ outerMargin: next });
    },
    [localData?.outerMargin, updateLocalData],
  );

  if (!localData) {
    return null;
  }

  const margin = localData.outerMargin ?? defaultMargin;

  return (
    <div className="space-y-3">
      <h1 className="text-sm">Layout</h1>
      <div className="flex flex-col bg-background-700 p-3.5 rounded-lg space-y-3">
        <div className="space-y-2">
          <div className="flex items-center space-x-1">
            <Label htmlFor="max-embed-width" className="font-normal text-sm">
              Max. embed width
            </Label>
            <QuestionTooltip>
              Maximum width of the embed container in pixels. Leave empty for no limit.
            </QuestionTooltip>
          </div>
          <div className="relative">
            <Input
              id="max-embed-width"
              type="text"
              inputMode="numeric"
              value={localData.maxEmbedWidth ?? ''}
              placeholder="None"
              onChange={handleNumberChange('maxEmbedWidth')}
              className="h-10 w-full rounded-lg border-0 bg-background px-4 pe-10 text-sm"
            />
            <span className="absolute inset-y-0 end-0 flex items-center pe-4 text-muted-foreground text-sm">
              px
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-1">
            <Label htmlFor="max-content-width" className="font-normal text-sm">
              Max. content width
            </Label>
            <QuestionTooltip>
              Maximum width of the banner content in pixels. Leave empty for no limit.
            </QuestionTooltip>
          </div>
          <div className="relative">
            <Input
              id="max-content-width"
              type="text"
              inputMode="numeric"
              value={localData.maxContentWidth ?? ''}
              placeholder="None"
              onChange={handleNumberChange('maxContentWidth')}
              className="h-10 w-full rounded-lg border-0 bg-background px-4 pe-10 text-sm"
            />
            <span className="absolute inset-y-0 end-0 flex items-center pe-4 text-muted-foreground text-sm">
              px
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-1">
            <Label htmlFor="border-radius" className="font-normal text-sm">
              Border radius
            </Label>
            <QuestionTooltip>Corner radius in pixels. Leave empty for default.</QuestionTooltip>
          </div>
          <div className="relative">
            <Input
              id="border-radius"
              type="text"
              inputMode="numeric"
              value={localData.borderRadius ?? ''}
              placeholder="None"
              onChange={handleNumberChange('borderRadius')}
              className="h-10 w-full rounded-lg border-0 bg-background px-4 pe-10 text-sm"
            />
            <span className="absolute inset-y-0 end-0 flex items-center pe-4 text-muted-foreground text-sm">
              px
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-1">
            <Label className="font-normal text-sm">Outer margin</Label>
            <QuestionTooltip>
              Margin around the banner (top, right, bottom, left) in pixels.
            </QuestionTooltip>
          </div>
          <div className="flex gap-x-2">
            <div className="flex flex-col justify-center">
              <Input
                id="margin-left"
                type="text"
                inputMode="numeric"
                value={margin.left}
                placeholder="Left"
                onChange={(e) => handleMarginChange('left', e.target.value)}
                className="bg-background flex-none w-20 rounded-lg border-0 px-4 text-sm"
              />
            </div>
            <div className="flex flex-col justify-center gap-y-2">
              <Input
                id="margin-top"
                type="text"
                inputMode="numeric"
                value={margin.top}
                placeholder="Top"
                onChange={(e) => handleMarginChange('top', e.target.value)}
                className="bg-background flex-none w-20 rounded-lg border-0 px-4 text-sm"
              />
              <Input
                id="margin-bottom"
                type="text"
                inputMode="numeric"
                value={margin.bottom}
                placeholder="Bottom"
                onChange={(e) => handleMarginChange('bottom', e.target.value)}
                className="bg-background flex-none w-20 rounded-lg border-0 px-4 text-sm"
              />
            </div>
            <div className="flex flex-col justify-center">
              <Input
                id="margin-right"
                type="text"
                inputMode="numeric"
                value={margin.right}
                placeholder="Right"
                onChange={(e) => handleMarginChange('right', e.target.value)}
                className="bg-background flex-none w-20 rounded-lg border-0 px-4 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

BannerLayout.displayName = 'BannerLayout';
