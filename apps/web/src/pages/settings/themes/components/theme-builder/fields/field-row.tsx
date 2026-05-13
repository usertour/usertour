import { QuestionTooltip } from '@usertour/tooltip';
import { cn } from '@usertour/tailwind';
import type { ReactNode } from 'react';

// Labels longer than this collapse into a vertical row (label on top, control
// below) so the title isn't truncated and the control still gets full width.
const LONG_LABEL_THRESHOLD = 20;

interface Props {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  controlClassName?: string;
  // Force vertical layout regardless of label length. Used by fields like
  // tooltip's missing-target-behavior where v1 sets `vertical={true}`.
  forceVertical?: boolean;
  // Optional explainer rendered as a `?`-icon QuestionTooltip next to the
  // label. Mirrors v1's per-setting tooltips (`tooltip="..."` on
  // ThemeSettingSelect / ThemeSettingInput).
  tooltip?: string;
}

export function FieldRow({
  label,
  htmlFor,
  children,
  controlClassName,
  forceVertical,
  tooltip,
}: Props) {
  const isLong = forceVertical || label.length > LONG_LABEL_THRESHOLD;
  if (isLong) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-sm font-medium leading-none">
          <label htmlFor={htmlFor}>{label}</label>
          {tooltip && <QuestionTooltip>{tooltip}</QuestionTooltip>}
        </div>
        <div className={cn('relative w-full', controlClassName)}>{children}</div>
      </div>
    );
  }
  return (
    <div className="flex items-center">
      <div className="flex grow items-center gap-1 text-sm font-medium leading-9">
        <label htmlFor={htmlFor}>{label}</label>
        {tooltip && <QuestionTooltip>{tooltip}</QuestionTooltip>}
      </div>
      <div className={cn('relative w-36 flex-none', controlClassName)}>{children}</div>
    </div>
  );
}
