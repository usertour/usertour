// NPS display component for preview and serialize

import * as Widget from '@usertour-packages/widget';
import { memo, useMemo } from 'react';

// Constants
export const NPS_SCALE_LENGTH = 11;
export const DEFAULT_LOW_LABEL = 'Not at all likely';
export const DEFAULT_HIGH_LABEL = 'Extremely likely';

const BUTTON_BASE_CLASS =
  'flex items-center overflow-hidden group relative border bg-sdk-question/10 text-sdk-question border-sdk-question hover:text-sdk-question hover:border-sdk-question hover:bg-sdk-question/40 rounded-md main-transition p-2 justify-center w-auto min-w-0';

// Memoized NPS Scale component for better performance
export const NPSScale = memo(({ onClick }: { onClick?: (value: number) => void }) => {
  const scaleButtons = useMemo(
    () =>
      Array.from({ length: NPS_SCALE_LENGTH }, (_, i) => (
        <Widget.Button
          key={`nps-button-${i}`}
          variant="custom"
          className={BUTTON_BASE_CLASS}
          onClick={() => onClick?.(i)}
        >
          {i}
        </Widget.Button>
      )),
    [onClick],
  );

  return (
    <div
      className="grid gap-1.5 !gap-1"
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
    <div className="flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80">
      <p>{lowLabel || DEFAULT_LOW_LABEL}</p>
      <p>{highLabel || DEFAULT_HIGH_LABEL}</p>
    </div>
  ),
);

NPSLabels.displayName = 'NPSLabels';
