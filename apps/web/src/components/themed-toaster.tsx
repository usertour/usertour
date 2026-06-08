import { Toaster } from '@usertour/ui';
import type { CSSProperties } from 'react';
import { useTheme } from '@/contexts/theme-context';

// sonner ships its own light/dark palettes (its dark is near-black). We feed it
// our resolved scheme AND remap its surface vars onto our tokens, so a toast
// reads as a `card`-level floating surface (per docs/conventions/dark-layering.md)
// rather than sonner's near-black. The token values themselves follow the
// `.dark` class, so light stays white and dark becomes card(16%).
const toastSurface = {
  '--normal-bg': 'hsl(var(--card))',
  '--normal-text': 'hsl(var(--card-foreground))',
  '--normal-border': 'hsl(var(--border))',
} as CSSProperties;

export const ThemedToaster = () => {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme} style={toastSurface} />;
};

ThemedToaster.displayName = 'ThemedToaster';
