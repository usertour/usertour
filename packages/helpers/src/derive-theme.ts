import type { ThemeTypesSetting } from '@usertour/types';
import { generateStateColors } from './color';
import { deepClone } from './utils';

const resolveAuto = (value: string, fallback: string): string =>
  value === 'Auto' ? fallback : value;

/**
 * Recompute every derived `auto*` color (the hover/active states resolved when a
 * color is set to 'Auto') from the current base colors, returning a new settings
 * object. This is the full, idempotent form of the builder's per-trigger cascade
 * (apps/web .../theme-builder/use-theme-draft.ts CASCADE_RULES) — the server runs
 * it after a settings write so an API-authored theme renders identically to one
 * tuned in the builder (both `convertSettings` reads these stored `auto*` values).
 *
 * Keep the rules below in sync with the builder cascade. `convertSettings` and
 * `generateStateColors` are the shared primitives both sides use.
 */
export const deriveThemeAutoColors = (settings: ThemeTypesSetting): ThemeTypesSetting => {
  const s = deepClone(settings);

  // Base colors
  const brand = generateStateColors(s.brandColor.background, s.brandColor.color);
  s.brandColor.autoHover = brand.hover;
  s.brandColor.autoActive = brand.active;
  const main = generateStateColors(s.mainColor.background, s.brandColor.background);
  s.mainColor.autoHover = main.hover;
  s.mainColor.autoActive = main.active;

  // Primary button — text mirrors the resolved color; background/border generate states.
  const pText = resolveAuto(s.buttons.primary.textColor.color, s.brandColor.color);
  s.buttons.primary.textColor.autoHover = pText;
  s.buttons.primary.textColor.autoActive = pText;
  const pBg = generateStateColors(
    resolveAuto(s.buttons.primary.backgroundColor.background, s.brandColor.background),
    s.brandColor.color,
  );
  s.buttons.primary.backgroundColor.autoHover = pBg.hover;
  s.buttons.primary.backgroundColor.autoActive = pBg.active;
  const pBorder = generateStateColors(
    resolveAuto(s.buttons.primary.border.color.color, s.brandColor.background),
    s.brandColor.color,
  );
  s.buttons.primary.border.color.autoHover = pBorder.hover;
  s.buttons.primary.border.color.autoActive = pBorder.active;

  // Secondary button — text/border mirror the resolved color; background generates states.
  const sText = resolveAuto(s.buttons.secondary.textColor.color, s.brandColor.background);
  s.buttons.secondary.textColor.autoHover = sText;
  s.buttons.secondary.textColor.autoActive = sText;
  const sBg = generateStateColors(
    resolveAuto(s.buttons.secondary.backgroundColor.background, s.mainColor.background),
    s.brandColor.background,
  );
  s.buttons.secondary.backgroundColor.autoHover = sBg.hover;
  s.buttons.secondary.backgroundColor.autoActive = sBg.active;
  const sBorder = resolveAuto(s.buttons.secondary.border.color.color, s.brandColor.background);
  s.buttons.secondary.border.color.autoHover = sBorder;
  s.buttons.secondary.border.color.autoActive = sBorder;

  return s;
};
