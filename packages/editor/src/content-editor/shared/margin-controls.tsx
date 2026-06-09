// Shared MarginControls component for content editor elements

import { BooleanField, Input } from '@usertour/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { MarginConfig, MarginPosition } from '../types/margin';

export interface MarginControlsProps {
  margin?: MarginConfig;
  onMarginChange: (position: MarginPosition, value: string) => void;
  onMarginEnabledChange: (enabled: boolean) => void;
}

export const MarginControls = memo(
  ({ margin, onMarginChange, onMarginEnabledChange }: MarginControlsProps) => {
    const { t } = useTranslation();

    const handleLeftChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => onMarginChange('left', e.target.value),
      [onMarginChange],
    );

    const handleTopChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => onMarginChange('top', e.target.value),
      [onMarginChange],
    );

    const handleBottomChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => onMarginChange('bottom', e.target.value),
      [onMarginChange],
    );

    const handleRightChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => onMarginChange('right', e.target.value),
      [onMarginChange],
    );

    return (
      <>
        <BooleanField
          label={t('contentBuilder.editor.margin.label')}
          checked={margin?.enabled ?? false}
          onChange={onMarginEnabledChange}
        />
        {margin?.enabled && (
          <div className="flex gap-x-2">
            <div className="flex flex-col justify-center">
              <Input
                variant="compact-surface"
                value={margin?.left ?? ''}
                placeholder={t('contentBuilder.editor.common.left')}
                onChange={handleLeftChange}
                className="flex-none w-20"
              />
            </div>
            <div className="flex flex-col justify-center gap-y-2">
              <Input
                variant="compact-surface"
                value={margin?.top ?? ''}
                onChange={handleTopChange}
                placeholder={t('contentBuilder.editor.common.top')}
                className="flex-none w-20"
              />
              <Input
                variant="compact-surface"
                value={margin?.bottom ?? ''}
                onChange={handleBottomChange}
                placeholder={t('contentBuilder.editor.common.bottom')}
                className="flex-none w-20"
              />
            </div>
            <div className="flex flex-col justify-center">
              <Input
                variant="compact-surface"
                value={margin?.right ?? ''}
                placeholder={t('contentBuilder.editor.common.right')}
                onChange={handleRightChange}
                className="flex-none w-20"
              />
            </div>
          </div>
        )}
      </>
    );
  },
);

MarginControls.displayName = 'MarginControls';
