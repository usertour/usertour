import type { ReactNode } from 'react';
import { FieldSection } from './field-section';

export interface SettingsCardProps {
  title: string;
  tooltip?: string;
  children: ReactNode;
}

// A titled settings group: a FieldSection heading over a soft slate card that
// holds the rows (BooleanField / SelectField). One shape for every content
// type's settings block, so they stop drifting apart.
export const SettingsCard = (props: SettingsCardProps) => {
  const { title, tooltip, children } = props;
  return (
    <FieldSection title={title} tooltip={tooltip}>
      <div className="flex flex-col space-y-2 rounded-lg bg-surface p-3.5">{children}</div>
    </FieldSection>
  );
};
SettingsCard.displayName = 'SettingsCard';
