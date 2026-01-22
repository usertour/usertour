// Scale display component for preview and serialize

import * as Widget from '@usertour-packages/widget';
import { forwardRef, memo, useCallback, useMemo } from 'react';

import type { ContentEditorScaleElement } from '../../../types/editor';

// Constants
const BUTTON_BASE_CLASS =
  'flex items-center overflow-hidden group relative border bg-sdk-question/10 text-sdk-question border-sdk-question hover:text-sdk-question hover:border-sdk-question hover:bg-sdk-question/40 rounded-md main-transition p-2 justify-center w-auto min-w-0';

const SCALE_GRID_CLASS = 'grid gap-1.5 !gap-1';
const LABELS_CONTAINER_CLASS =
  'flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80';

// Utility functions
export const calculateScaleLength = (lowRange: number, highRange: number): number => {
  return Math.max(0, highRange - lowRange + 1);
};

export const validateScaleRange = (lowRange: number, highRange: number): boolean => {
  return lowRange <= highRange && lowRange >= 0 && highRange <= 100;
};

// Memoized Scale Button Component
const ScaleButton = memo<{ value: number; onClick?: () => void; isInteractive?: boolean }>(
  ({ value, onClick, isInteractive = true }) => (
    <Widget.Button
      variant="custom"
      className={BUTTON_BASE_CLASS}
      onClick={onClick}
      disabled={!isInteractive}
      aria-label={`Scale option ${value}`}
    >
      {value}
    </Widget.Button>
  ),
);

ScaleButton.displayName = 'ScaleButton';

// Scale Display Component Props
export interface ScaleDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  lowRange: number;
  highRange: number;
  lowLabel?: string;
  highLabel?: string;
  onValueChange?: (element: ContentEditorScaleElement, value: number) => void;
  element?: ContentEditorScaleElement;
}

// Memoized Scale Display Component with forwardRef for Radix compatibility
export const ScaleDisplay = memo(
  forwardRef<HTMLDivElement, ScaleDisplayProps>(
    ({ lowRange, highRange, lowLabel, highLabel, onValueChange, element, ...props }, ref) => {
      const scaleValues = useMemo(() => {
        const length = calculateScaleLength(lowRange, highRange);
        return Array.from({ length }, (_, i) => lowRange + i);
      }, [lowRange, highRange]);
      const scaleLength = scaleValues.length;

      const handleValueChange = useCallback(
        (value: number) => {
          if (onValueChange && element) {
            onValueChange(element, value);
          }
        },
        [onValueChange, element],
      );

      return (
        <div ref={ref} className="w-full" {...props}>
          <div
            className={SCALE_GRID_CLASS}
            style={{
              gridTemplateColumns: `repeat(${scaleLength}, minmax(0px, 1fr))`,
            }}
            role="radiogroup"
            aria-label="Scale options"
          >
            {scaleValues.map((value) => (
              <ScaleButton
                key={value}
                value={value}
                onClick={() => handleValueChange(value)}
                isInteractive={!!onValueChange}
              />
            ))}
          </div>
          {(lowLabel || highLabel) && (
            <div className={LABELS_CONTAINER_CLASS}>
              <p>{lowLabel}</p>
              <p>{highLabel}</p>
            </div>
          )}
        </div>
      );
    },
  ),
);

ScaleDisplay.displayName = 'ScaleDisplay';
