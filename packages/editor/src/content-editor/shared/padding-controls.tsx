// Shared PaddingControls component for content editor elements

import { BooleanField, Input } from '@usertour/ui';
import type { ContentEditorPadding } from '@usertour/types';
import { PADDING_KEY_MAPPING } from '@usertour/widget';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type PaddingPosition = keyof typeof PADDING_KEY_MAPPING;

export interface PaddingControlsProps {
  padding?: ContentEditorPadding;
  onPaddingChange: (position: PaddingPosition, value: string) => void;
  onPaddingEnabledChange: (enabled: boolean) => void;
}

export const PaddingControls = memo(
  ({ padding, onPaddingChange, onPaddingEnabledChange }: PaddingControlsProps) => {
    const { t } = useTranslation();

    const handleLeftChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => onPaddingChange('left', e.target.value),
      [onPaddingChange],
    );

    const handleTopChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => onPaddingChange('top', e.target.value),
      [onPaddingChange],
    );

    const handleBottomChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => onPaddingChange('bottom', e.target.value),
      [onPaddingChange],
    );

    const handleRightChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => onPaddingChange('right', e.target.value),
      [onPaddingChange],
    );

    return (
      <>
        <BooleanField
          label={t('contentBuilder.editor.padding.label')}
          checked={padding?.enabled ?? false}
          onChange={onPaddingEnabledChange}
        />
        {padding?.enabled && (
          <div className="flex gap-x-2">
            <div className="flex flex-col justify-center">
              <Input
                variant="compact-surface"
                value={padding?.left ?? ''}
                placeholder={t('contentBuilder.editor.common.left')}
                onChange={handleLeftChange}
                className="flex-none w-20"
              />
            </div>
            <div className="flex flex-col justify-center gap-y-2">
              <Input
                variant="compact-surface"
                value={padding?.top ?? ''}
                onChange={handleTopChange}
                placeholder={t('contentBuilder.editor.common.top')}
                className="flex-none w-20"
              />
              <Input
                variant="compact-surface"
                value={padding?.bottom ?? ''}
                onChange={handleBottomChange}
                placeholder={t('contentBuilder.editor.common.bottom')}
                className="flex-none w-20"
              />
            </div>
            <div className="flex flex-col justify-center">
              <Input
                variant="compact-surface"
                value={padding?.right ?? ''}
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

PaddingControls.displayName = 'PaddingControls';
