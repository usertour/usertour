// Shared MarginControls component for content editor elements

import { Checkbox } from '@usertour-packages/checkbox';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { memo, useCallback } from 'react';

import type { MarginConfig, MarginPosition } from '../types/margin';

export interface MarginControlsProps {
  margin?: MarginConfig;
  onMarginChange: (position: MarginPosition, value: string) => void;
  onMarginEnabledChange: (enabled: boolean) => void;
}

export const MarginControls = memo(
  ({ margin, onMarginChange, onMarginEnabledChange }: MarginControlsProps) => {
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
        <div className="flex gap-x-2">
          <Checkbox id="margin" checked={margin?.enabled} onCheckedChange={onMarginEnabledChange} />
          <Label htmlFor="margin">Margin</Label>
        </div>
        {margin?.enabled && (
          <div className="flex gap-x-2">
            <div className="flex flex-col justify-center">
              <Input
                value={margin?.left}
                placeholder="Left"
                onChange={handleLeftChange}
                className="bg-background flex-none w-20"
              />
            </div>
            <div className="flex flex-col justify-center gap-y-2">
              <Input
                value={margin?.top}
                onChange={handleTopChange}
                placeholder="Top"
                className="bg-background flex-none w-20"
              />
              <Input
                value={margin?.bottom}
                onChange={handleBottomChange}
                placeholder="Bottom"
                className="bg-background flex-none w-20"
              />
            </div>
            <div className="flex flex-col justify-center">
              <Input
                value={margin?.right}
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

MarginControls.displayName = 'MarginControls';
