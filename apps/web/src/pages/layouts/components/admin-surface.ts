export type AdminLayoutSurface = 'canvas' | 'muted' | 'default';

export const SURFACE_BODY_CLASSNAMES: Record<AdminLayoutSurface, string> = {
  canvas: 'bg-[url(/images/grid--light.svg)] dark:bg-[url(/images/grid--dark.svg)]',
  muted: 'bg-slate-100 dark:bg-background',
  default: 'bg-slate-50',
};
