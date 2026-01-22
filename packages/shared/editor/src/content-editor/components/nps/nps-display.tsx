// NPS display component for preview and serialize

import * as Widget from '@usertour-packages/widget';
import { memo, useMemo } from 'react';

import {
  NPS_SCALE_LENGTH,
  NPS_DEFAULT_LOW_LABEL,
  NPS_DEFAULT_HIGH_LABEL,
  QUESTION_BUTTON_BASE_CLASS,
  QUESTION_SCALE_GRID_CLASS,
  QUESTION_LABELS_CONTAINER_CLASS,
} from '../../constants';

// Re-export constants for backward compatibility
export { NPS_SCALE_LENGTH } from '../../constants';
export const DEFAULT_LOW_LABEL = NPS_DEFAULT_LOW_LABEL;
export const DEFAULT_HIGH_LABEL = NPS_DEFAULT_HIGH_LABEL;

// Memoized NPS Scale component for better performance
export const NPSScale = memo(({ onClick }: { onClick?: (value: number) => void }) => {
  const scaleButtons = useMemo(
    () =>
      Array.from({ length: NPS_SCALE_LENGTH }, (_, i) => (
        <Widget.Button
          key={`nps-button-${i}`}
          variant="custom"
          className={QUESTION_BUTTON_BASE_CLASS}
          onClick={() => onClick?.(i)}
        >
          {i}
        </Widget.Button>
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

// Memoized Labels component
export const NPSLabels = memo(
  ({ lowLabel, highLabel }: { lowLabel?: string; highLabel?: string }) => (
    <div className={QUESTION_LABELS_CONTAINER_CLASS}>
      <p>{lowLabel || NPS_DEFAULT_LOW_LABEL}</p>
      <p>{highLabel || NPS_DEFAULT_HIGH_LABEL}</p>
    </div>
  ),
);

NPSLabels.displayName = 'NPSLabels';
