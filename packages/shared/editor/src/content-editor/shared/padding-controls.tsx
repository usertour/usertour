// Shared PaddingControls component for content editor elements

import { Checkbox } from '@usertour-packages/checkbox';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import type { ContentEditorPadding } from '@usertour/types';
import { PADDING_KEY_MAPPING } from '@usertour-packages/widget';
import { memo, useCallback, useId } from 'react';

type PaddingPosition = keyof typeof PADDING_KEY_MAPPING;

export interface PaddingControlsProps {
  padding?: ContentEditorPadding;
  onPaddingChange: (position: PaddingPosition, value: string) => void;
  onPaddingEnabledChange: (enabled: boolean) => void;
}

export const PaddingControls = memo(
  ({ padding, onPaddingChange, onPaddingEnabledChange }: PaddingControlsProps) => {
    const id = useId();
    const paddingCheckboxId = `${id}-padding`;

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
        <div className="flex gap-x-2">
          <Checkbox
            id={paddingCheckboxId}
            checked={padding?.enabled ?? false}
            onCheckedChange={onPaddingEnabledChange}
          />
          <Label htmlFor={paddingCheckboxId}>Padding</Label>
        </div>
        {padding?.enabled && (
          <div className="flex gap-x-2">
            <div className="flex flex-col justify-center">
              <Input
                value={padding?.left ?? ''}
                placeholder="Left"
                onChange={handleLeftChange}
                className="bg-background flex-none w-20"
              />
            </div>
            <div className="flex flex-col justify-center gap-y-2">
              <Input
                value={padding?.top ?? ''}
                onChange={handleTopChange}
                placeholder="Top"
                className="bg-background flex-none w-20"
              />
              <Input
                value={padding?.bottom ?? ''}
                onChange={handleBottomChange}
                placeholder="Bottom"
                className="bg-background flex-none w-20"
              />
            </div>
            <div className="flex flex-col justify-center">
              <Input
                value={padding?.right ?? ''}
                placeholder="Right"
                onChange={handleRightChange}
                className="bg-background flex-none w-20"
              />
            </div>
          </div>
        )}
      </>
    );
  },
);

PaddingControls.displayName = 'PaddingControls';
