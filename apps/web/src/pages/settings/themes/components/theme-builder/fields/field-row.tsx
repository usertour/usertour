import { cn } from '@usertour-packages/tailwind';
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
}

export function FieldRow({ label, htmlFor, children, controlClassName, forceVertical }: Props) {
  const isLong = forceVertical || label.length > LONG_LABEL_THRESHOLD;
  if (isLong) {
    return (
      <div className="space-y-1.5">
        <label htmlFor={htmlFor} className="block text-xs font-medium leading-none">
          {label}
        </label>
        <div className={cn('relative w-full', controlClassName)}>{children}</div>
      </div>
    );
  }
  return (
    <div className="flex items-center">
      <label htmlFor={htmlFor} className="grow text-xs font-medium leading-9">
        {label}
      </label>
      <div className={cn('relative w-36 flex-none', controlClassName)}>{children}</div>
    </div>
  );
}
