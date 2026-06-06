import { QuestionTooltip } from '@usertour/ui';
import type { ReactNode } from 'react';

export interface FieldSectionProps {
  title: string;
  // Optional explainer rendered as a `?`-icon tooltip next to the title.
  tooltip?: string;
  children: ReactNode;
}

// A titled block in a settings sidebar: a heading followed by its content,
// stacked vertically. Used for grouped or card-style controls that don't fit a
// single label-and-control row.
export const FieldSection = (props: FieldSectionProps) => {
  const { title, tooltip, children } = props;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <h3 className="text-sm text-foreground">{title}</h3>
        {tooltip && <QuestionTooltip>{tooltip}</QuestionTooltip>}
      </div>
      {children}
    </div>
  );
};

FieldSection.displayName = 'FieldSection';
