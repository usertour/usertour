import {
  Tabs,
  UnderlineTabsContent,
  UnderlineTabsList,
  UnderlineTabsTrigger,
} from '@usertour-packages/tabs';
import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';

// V2 wrappers around the shared Underline tabs that pin the trigger label to
// `text-xs`, matching the rest of the right sidebar's 12px rhythm. The shared
// component still defaults to text-sm for use elsewhere.

export const BuilderTabs = Tabs;
export const BuilderTabsList = UnderlineTabsList;
export const BuilderTabsContent = UnderlineTabsContent;

type TriggerProps = React.ComponentPropsWithoutRef<typeof UnderlineTabsTrigger>;

export const BuilderTabsTrigger = forwardRef<
  React.ElementRef<typeof UnderlineTabsTrigger>,
  TriggerProps
>(({ className, ...props }, ref) => (
  <UnderlineTabsTrigger ref={ref} className={cn('text-xs', className)} {...props} />
));
BuilderTabsTrigger.displayName = 'BuilderTabsTrigger';
