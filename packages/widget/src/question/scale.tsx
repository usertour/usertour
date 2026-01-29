// Scale component for SDK widget

import { forwardRef, memo, useCallback, useMemo } from 'react';

import { Button } from '../primitives';
import {
  QUESTION_BUTTON_BASE_CLASS,
  QUESTION_LABELS_CONTAINER_CLASS,
  QUESTION_SCALE_GRID_CLASS,
} from './constants';

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
    <Button
      variant="custom"
      className={QUESTION_BUTTON_BASE_CLASS}
      onClick={onClick}
      disabled={!isInteractive}
      aria-label={`Scale option ${value}`}
    >
      {value}
    </Button>
  ),
);

ScaleButton.displayName = 'ScaleButton';

// Scale Component Props
export interface ScaleProps extends React.HTMLAttributes<HTMLDivElement> {
  lowRange: number;
  highRange: number;
  lowLabel?: string;
  highLabel?: string;
  onValueChange?: (value: number) => void;
  isInteractive?: boolean;
}

/**
 * Scale component for SDK widget
 * Displays interactive or static numeric scale UI
 */
export const Scale = memo(
  forwardRef<HTMLDivElement, ScaleProps>(
    (
      { lowRange, highRange, lowLabel, highLabel, onValueChange, isInteractive = true, ...props },
      ref,
    ) => {
      const scaleValues = useMemo(() => {
        const length = calculateScaleLength(lowRange, highRange);
        return Array.from({ length }, (_, i) => lowRange + i);
      }, [lowRange, highRange]);
      const scaleLength = scaleValues.length;

      const handleValueChange = useCallback(
        (value: number) => {
          if (onValueChange) {
            onValueChange(value);
          }
        },
        [onValueChange],
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
                isInteractive={isInteractive && !!onValueChange}
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

Scale.displayName = 'Scale';

// Backward compatibility alias
export const ScaleDisplay = Scale;
export type ScaleDisplayProps = ScaleProps;
