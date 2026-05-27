'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { type VariantProps, cva } from 'class-variance-authority';
import { motion } from 'framer-motion';
import * as React from 'react';

import { cn } from '@usertour/tailwind';

// ============================================================================
// Active-tab indicator: shared element transition
// ============================================================================
//
// `Tabs` provides a context with the current active value plus a unique
// `layoutId`. Each trigger (pill or underline variant) renders a
// `motion.span` indicator only when active; framer-motion's `layoutId`
// interpolates that span's position between triggers on every switch.
// Result: the indicator hops smoothly, content stays instant.

interface TabsContextValue {
  active: string;
  layoutId: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {}

const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
  ({ value, defaultValue, onValueChange, children, ...props }, ref) => {
    const isControlled = value !== undefined;
    const [internal, setInternal] = React.useState<string>(
      typeof defaultValue === 'string' ? defaultValue : '',
    );
    const active = isControlled ? (value ?? '') : internal;
    const generatedId = React.useId();
    const layoutId = `tabs-active-indicator-${generatedId}`;

    const handle = (next: string) => {
      if (!isControlled) {
        setInternal(next);
      }
      onValueChange?.(next);
    };

    return (
      <TabsContext.Provider value={{ active, layoutId }}>
        <TabsPrimitive.Root
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onValueChange={handle}
          {...props}
        >
          {children}
        </TabsPrimitive.Root>
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = 'Tabs';

const useTabsContext = () => {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs trigger / content components must live inside <Tabs>.');
  }
  return ctx;
};

// ============================================================================
// Pill Style Tabs (Default)
// ============================================================================

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

// Named "active style" variants. Both the trigger's resting/active text
// classes and the indicator pill's background are driven by the same
// `variant` key so a consumer just picks `default` (neutral white pill +
// foreground text) or `primary` (brand-blue pill + primary-foreground
// text). Adding a new variant means one entry in `tabsTriggerVariants`
// and one matching entry in `indicatorBackgroundByVariant`.
const tabsTriggerVariants = cva(
  // Resting / hover / focus / disabled styling. The active pill itself
  // is owned by the motion.span below; only the *text* color flips here
  // via data-state because text doesn't need to slide.
  'relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'data-[state=active]:text-foreground',
        primary: 'data-[state=active]:text-primary-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const indicatorBackgroundByVariant: Record<'default' | 'primary', string> = {
  default: 'bg-background',
  primary: 'bg-primary',
};

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant, children, value, ...props }, ref) => {
  const ctx = useTabsContext();
  const isActive = ctx.active === value;
  const resolvedVariant = variant ?? 'default';
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(tabsTriggerVariants({ variant: resolvedVariant }), className)}
      {...props}
    >
      {isActive && (
        <motion.span
          layoutId={ctx.layoutId}
          className={cn(
            'absolute inset-0 rounded-md shadow',
            indicatorBackgroundByVariant[resolvedVariant],
          )}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        />
      )}
      <span className="relative z-10 inline-flex items-center">{children}</span>
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

// ============================================================================
// Underline Style Tabs
// ============================================================================

const UnderlineTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('flex justify-center gap-4 border-b border-border', className)}
    {...props}
  />
));
UnderlineTabsList.displayName = 'UnderlineTabsList';

const underlineTabsTriggerVariants = cva(
  // `border-b-2 border-transparent` reserves the same 2px gutter the
  // active bar will sit in, so inactive ↔ active doesn't shift the
  // baseline. The bar itself is rendered as a motion.span (below) for
  // layoutId-driven sliding; `data-[state=active]:border-primary` is
  // intentionally omitted so the bar isn't double-rendered.
  'relative pb-2 font-medium transition-colors border-b-2 -mb-px border-transparent text-muted-foreground hover:text-foreground data-[state=active]:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'text-sm',
        // Compact — used inside dense panels (theme-builder inspector tabs).
        compact: 'text-sm',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface UnderlineTabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof underlineTabsTriggerVariants> {}

const UnderlineTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  UnderlineTabsTriggerProps
>(({ className, children, variant, value, ...props }, ref) => {
  const ctx = useTabsContext();
  const isActive = ctx.active === value;
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(underlineTabsTriggerVariants({ variant }), className)}
      {...props}
    >
      {children}
      {isActive && (
        <motion.span
          layoutId={ctx.layoutId}
          className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        />
      )}
    </TabsPrimitive.Trigger>
  );
});
UnderlineTabsTrigger.displayName = 'UnderlineTabsTrigger';

const UnderlineTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-3 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
UnderlineTabsContent.displayName = 'UnderlineTabsContent';

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  UnderlineTabsList,
  UnderlineTabsTrigger,
  UnderlineTabsContent,
};
