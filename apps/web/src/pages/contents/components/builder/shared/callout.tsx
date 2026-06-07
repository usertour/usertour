import { cn } from '@usertour/tailwind';
import type { ReactNode } from 'react';

export type CalloutVariant = 'info' | 'warning';

export interface CalloutProps {
  variant?: CalloutVariant;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

// A subtle inline callout: a left accent bar carries the semantic color
// (info → blue, warning → amber, both via the --info / --warning tokens) while
// the text stays neutral slate, so it reads as a note inside dense forms
// without the visual weight of a filled block.
const accentBar: Record<CalloutVariant, string> = {
  info: 'border-info',
  warning: 'border-warning',
};

export const Callout = (props: CalloutProps) => {
  const { variant = 'info', title, children, className } = props;
  return (
    <div className={cn('border-l-2 py-0.5 pl-3', accentBar[variant], className)}>
      {title ? <p className="mb-1 text-sm font-medium text-slate-700">{title}</p> : null}
      <div className="text-sm leading-relaxed text-slate-600">{children}</div>
    </div>
  );
};
Callout.displayName = 'Callout';
