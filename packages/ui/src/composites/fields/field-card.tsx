import type { ReactNode } from 'react';
import { FieldSection } from './field-section';
import { SurfaceCard } from './surface-card';

export interface FieldCardProps {
  title: string;
  tooltip?: string;
  children: ReactNode;
}

// A titled settings group: a FieldSection heading over a soft slate card that
// holds the rows (BooleanField / SelectField / NumberField). One shape for
// every content type's settings block, so they stop drifting apart.
//
// Named FieldCard (not SettingsCard) to avoid colliding with the page-level
// SettingsCard in composites/settings — that one is a full-width form wrapper;
// this one groups dense field rows.
export const FieldCard = (props: FieldCardProps) => {
  const { title, tooltip, children } = props;
  return (
    <FieldSection title={title} tooltip={tooltip}>
      <SurfaceCard className="flex flex-col space-y-2">{children}</SurfaceCard>
    </FieldSection>
  );
};
FieldCard.displayName = 'FieldCard';
