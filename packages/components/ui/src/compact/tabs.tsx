import {
  Tabs,
  UnderlineTabsContent,
  UnderlineTabsList,
  UnderlineTabsTrigger,
} from '@usertour-packages/tabs';
import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';

// Wrappers around the shared Underline tabs that pin the trigger label to
// `text-xs`, matching the 12px rhythm used elsewhere in the compact family.
// The shared component still defaults to text-sm for use elsewhere.

export const CompactTabs = Tabs;
export const CompactTabsList = UnderlineTabsList;
export const CompactTabsContent = UnderlineTabsContent;

type TriggerProps = React.ComponentPropsWithoutRef<typeof UnderlineTabsTrigger>;

export const CompactTabsTrigger = forwardRef<
  React.ElementRef<typeof UnderlineTabsTrigger>,
  TriggerProps
>(({ className, ...props }, ref) => (
  <UnderlineTabsTrigger ref={ref} className={cn('text-xs', className)} {...props} />
));
CompactTabsTrigger.displayName = 'CompactTabsTrigger';
