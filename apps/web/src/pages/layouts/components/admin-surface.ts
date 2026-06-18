export type AdminLayoutSurface = 'canvas' | 'muted' | 'default';

export const SURFACE_BODY_CLASSNAMES: Record<AdminLayoutSurface, string> = {
  canvas: 'bg-dot-grid',
  // muted and default share the same body surface now; the muted/default split
  // only affects the inner content area (see admin-layout's surfaceClassName).
  muted: 'bg-surface',
  default: 'bg-surface',
};
