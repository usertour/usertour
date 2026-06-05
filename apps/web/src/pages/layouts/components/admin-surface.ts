export type AdminLayoutSurface = 'canvas' | 'muted' | 'default';

export const SURFACE_BODY_CLASSNAMES: Record<AdminLayoutSurface, string> = {
  canvas:
    'bg-[#fbfcfe] bg-[radial-gradient(#dfe5ee_1.1px,transparent_1.1px)] bg-[length:24px_24px]',
  muted: 'bg-slate-100 dark:bg-background',
  default: 'bg-slate-50',
};
