import chroma from 'chroma-js';

/**
 * Convert hex color to HSL string format for Tailwind CSS
 * @param hexColor - Hex color string (e.g., "#FFFFFF")
 * @returns HSL string format (e.g., "0 0% 100%")
 */
export function hexToHSLString(hexColor: string): string {
  try {
    const color = chroma(hexColor);
    const [h, s, l] = color.hsl();

    // Convert to degrees and percentages
    const hDeg = Math.round(h || 0);
    const sPct = Math.round(s * 100);
    const lPct = Math.round(l * 100);

    return `${hDeg} ${sPct}% ${lPct}%`;
  } catch (error) {
    console.warn(`Failed to convert ${hexColor} to HSL string:`, error);
    return '0 0% 0%'; // Fallback to black
  }
}

/**
 * Convert hex color to RGB string format (e.g., "255, 255, 255")
 * @param hex - Hex color string (e.g., "#FFFFFF")
 * @returns RGB string format without alpha
 */
export const hexToRGBStr = (hex: string): string => {
  try {
    const color = chroma(hex);
    const [r, g, b] = color.rgb();
    return `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;
  } catch (error) {
    console.warn(`Failed to convert ${hex} to RGB string:`, error);
    return '0, 0, 0'; // Fallback to black
  }
};

/**
 * Automatically generate hover and active colors based on baseColor and brandColor.
 * If baseColor is similar to brandColor, hover is mixed with white (LAB), active is darkened.
 * If baseColor is light (e.g., white), hover/active are mixed with brandColor (LAB).
 * Otherwise, hover is mixed with brandColor (LAB), active is darkened.
 * @param baseColor - The base color (e.g., button or content background)
 * @param brandColor - The brand color
 * @param hoverRatio - Mix ratio for hover state (default 0.15)
 * @param activeDarken - Darken factor for active state (default 0.12)
 * @returns An object with hover and active color hex strings
 */
export function generateAutoStateColors(
  baseColor: string,
  brandColor: string,
  hoverRatio = 0.12,
  activeRatio = 0.24,
) {
  const isBaseLight = chroma(baseColor).luminance() > 0.8;
  const isBaseBrand = chroma.distance(baseColor, brandColor) < 10;

  let hover: string;
  let active: string;

  if (isBaseBrand) {
    // Brand color: mix with white
    hover = chroma.mix(baseColor, '#fff', hoverRatio, 'rgb').hex();
    active = chroma.mix(baseColor, '#fff', activeRatio, 'rgb').hex();
  } else if (isBaseLight) {
    // Light base: mix with brand color
    hover = chroma.mix(baseColor, brandColor, hoverRatio, 'rgb').hex();
    active = chroma.mix(baseColor, brandColor, activeRatio, 'rgb').hex();
  } else {
    // Other: mix with brand color
    hover = chroma.mix(baseColor, brandColor, hoverRatio, 'rgb').hex();
    active = chroma.mix(baseColor, brandColor, activeRatio, 'rgb').hex();
  }

  return { hover, active };
}
