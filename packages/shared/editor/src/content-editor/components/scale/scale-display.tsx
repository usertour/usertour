// Scale display component for preview and serialize

import * as Widget from '@usertour-packages/widget';
import { forwardRef, memo, useCallback, useMemo } from 'react';

import type { ContentEditorScaleElement } from '../../../types/editor';
import {
  QUESTION_BUTTON_BASE_CLASS,
  QUESTION_SCALE_GRID_CLASS,
  QUESTION_LABELS_CONTAINER_CLASS,
} from '../../constants';

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
      className={QUESTION_BUTTON_BASE_CLASS}
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
            className={QUESTION_SCALE_GRID_CLASS}
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
            <div className={QUESTION_LABELS_CONTAINER_CLASS}>
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
