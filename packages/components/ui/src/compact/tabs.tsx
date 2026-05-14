import {
  Tabs,
  UnderlineTabsContent,
  UnderlineTabsList,
  UnderlineTabsTrigger,
} from '@usertour/tabs';
import { forwardRef } from 'react';

// Compact tabs — Trigger uses the underline tabs' compact variant
// (12px label) so the rhythm matches the rest of the compact family.

export const CompactTabs = Tabs;
export const CompactTabsList = UnderlineTabsList;
export const CompactTabsContent = UnderlineTabsContent;

type TriggerProps = React.ComponentPropsWithoutRef<typeof UnderlineTabsTrigger>;

export const CompactTabsTrigger = forwardRef<
  React.ElementRef<typeof UnderlineTabsTrigger>,
  TriggerProps
>(({ variant = 'compact', ...props }, ref) => (
  <UnderlineTabsTrigger ref={ref} variant={variant} {...props} />
));
CompactTabsTrigger.displayName = 'CompactTabsTrigger';
