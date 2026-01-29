// NPS (Net Promoter Score) component for SDK widget

import { memo, useMemo } from 'react';

import { Button } from '../primitives';
import {
  NPS_DEFAULT_HIGH_LABEL,
  NPS_DEFAULT_LOW_LABEL,
  NPS_SCALE_LENGTH,
  QUESTION_BUTTON_BASE_CLASS,
  QUESTION_LABELS_CONTAINER_CLASS,
  QUESTION_SCALE_GRID_CLASS,
} from './constants';

// Re-export constants for backward compatibility
export { NPS_SCALE_LENGTH, NPS_DEFAULT_LOW_LABEL, NPS_DEFAULT_HIGH_LABEL } from './constants';
export const DEFAULT_LOW_LABEL = NPS_DEFAULT_LOW_LABEL;
export const DEFAULT_HIGH_LABEL = NPS_DEFAULT_HIGH_LABEL;

export interface NPSScaleProps {
  onClick?: (value: number) => void;
}

/**
 * NPS Scale component for SDK widget
 * Displays 0-10 scale buttons for NPS rating
 */
export const NPSScale = memo(({ onClick }: NPSScaleProps) => {
  const scaleButtons = useMemo(
    () =>
      Array.from({ length: NPS_SCALE_LENGTH }, (_, i) => (
        <Button
          key={`nps-button-${i}`}
          variant="custom"
          className={QUESTION_BUTTON_BASE_CLASS}
          onClick={() => onClick?.(i)}
        >
          {i}
        </Button>
      )),
    [onClick],
  );

  return (
    <div
      className={QUESTION_SCALE_GRID_CLASS}
      style={{ gridTemplateColumns: `repeat(${NPS_SCALE_LENGTH}, minmax(0px, 1fr))` }}
    >
      {scaleButtons}
    </div>
  );
});

NPSScale.displayName = 'NPSScale';

export interface NPSLabelsProps {
  lowLabel?: string;
  highLabel?: string;
}

/**
 * NPS Labels component for SDK widget
 * Displays low and high range labels
 */
export const NPSLabels = memo(({ lowLabel, highLabel }: NPSLabelsProps) => (
  <div className={QUESTION_LABELS_CONTAINER_CLASS}>
    <p>{lowLabel || NPS_DEFAULT_LOW_LABEL}</p>
    <p>{highLabel || NPS_DEFAULT_HIGH_LABEL}</p>
  </div>
));

NPSLabels.displayName = 'NPSLabels';
