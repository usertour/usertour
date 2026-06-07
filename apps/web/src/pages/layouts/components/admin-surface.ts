export type AdminLayoutSurface = 'canvas' | 'muted' | 'default';

export const SURFACE_BODY_CLASSNAMES: Record<AdminLayoutSurface, string> = {
  canvas: 'bg-dot-grid',
  muted: 'bg-muted dark:bg-background',
  default: 'bg-surface',
};
