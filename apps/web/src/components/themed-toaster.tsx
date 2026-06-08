import { Toaster } from '@usertour/ui';
import type { CSSProperties } from 'react';
import { useTheme } from '@/contexts/theme-context';

// sonner's dark palette paints toasts near-black and its drop-shadow vanishes
// on a dark page, so a toast read as a hard slab flush with the content area
// (also card 16%). Lift it instead:
//   - bg = `popover` (21%) — one step lighter than the card(16%) content area,
//     so the toast floats by lightness (dark can't rely on shadow alone).
//   - border softened to 50% — the lift comes from contrast + shadow, not a
//     hard outline.
//   - a darker, larger drop-shadow in dark to restore the soft float that the
//     light theme gets for free. sonner paints its own box-shadow via a
//     `[data-sonner-toast]` rule that out-specifies a Tailwind `dark:shadow-*`
//     utility, so apply ours as an inline style (highest specificity) instead.
// Light is unchanged: popover == card == white, and the dark shadow is dark-only.
const toastSurface = {
  '--normal-bg': 'hsl(var(--popover))',
  '--normal-text': 'hsl(var(--popover-foreground))',
  '--normal-border': 'hsl(var(--border) / 0.5)',
} as CSSProperties;

const darkToastShadow = {
  boxShadow: '0 10px 30px -8px rgba(0, 0, 0, 0.5)',
} as CSSProperties;

export const ThemedToaster = () => {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme}
      style={toastSurface}
      toastOptions={resolvedTheme === 'dark' ? { style: darkToastShadow } : undefined}
    />
  );
};

ThemedToaster.displayName = 'ThemedToaster';
