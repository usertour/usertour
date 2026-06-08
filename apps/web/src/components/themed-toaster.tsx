import { Toaster } from '@usertour/ui';
import { useTheme } from '@/contexts/theme-context';

// sonner's Toaster defaults to a light theme, so without this toasts stay white
// in dark mode. Feed it our resolved scheme (system already collapsed to
// light/dark) so toasts track the in-app theme rather than only the OS.
export const ThemedToaster = () => {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme} />;
};

ThemedToaster.displayName = 'ThemedToaster';
