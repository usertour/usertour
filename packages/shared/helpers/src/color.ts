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

// ============================================================================
// State Color Generation Algorithm
// Based on Lab luminance-driven dynamic ratio calculation
// ============================================================================

type RGB = [number, number, number];

/**
 * Parse hex color string to RGB array
 */
function hexToRgb(hex: string): RGB {
  if (!hex) return [0, 0, 0];

  // Handle #RRGGBB format
  if (hex.match(/^#[0-9a-f]{6}$/i)) {
    return [
      Number.parseInt(hex.substring(1, 3), 16),
      Number.parseInt(hex.substring(3, 5), 16),
      Number.parseInt(hex.substring(5, 7), 16),
    ];
  }

  // Handle #RGB format
  if (hex.match(/^#[0-9a-f]{3}$/i)) {
    return [
      Number.parseInt(hex.substring(1, 2).repeat(2), 16),
      Number.parseInt(hex.substring(2, 3).repeat(2), 16),
      Number.parseInt(hex.substring(3, 4).repeat(2), 16),
    ];
  }

  return [0, 0, 0];
}

/**
 * Convert RGB array to hex color string
 */
function rgbToHex([r, g, b]: RGB): string {
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');
  return `#${rHex}${gHex}${bHex}`;
}

/**
 * Convert RGB to HSL
 * @returns [h, s, l] where h is 0-1, s is 0-1, l is 0-1
 */
function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      default:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h, s, l];
}

/**
 * Calculate Lab L* luminance value (0-100 scale, returned as 0-1)
 * Uses sRGB to XYZ conversion and then to Lab L*
 */
function getLabLuminance([r, g, b]: RGB): number {
  // sRGB to linear RGB
  function linearize(channel: number): number {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }

  // Calculate relative luminance (Y in XYZ)
  const y = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);

  // Convert Y to Lab L*
  function yToLabL(yVal: number): number {
    return yVal <= 216 / 24389 ? yVal * (24389 / 27) : yVal ** (1 / 3) * 116 - 16;
  }

  // Return L* normalized to 0-1 range (L* is 0-100)
  return Math.round(yToLabL(y) * 10) / 1000;
}

/**
 * Get inverted/complementary color
 */
function invertColor([r, g, b]: RGB): RGB {
  return [Math.round(255 - r), Math.round(255 - g), Math.round(255 - b)];
}

/**
 * Linear interpolation between two RGB colors
 */
function mixRgb(color1: RGB, color2: RGB, ratio: number): RGB {
  return [
    Math.max(0, Math.min(255, Math.round(color1[0] + (color2[0] - color1[0]) * ratio))),
    Math.max(0, Math.min(255, Math.round(color1[1] + (color2[1] - color1[1]) * ratio))),
    Math.max(0, Math.min(255, Math.round(color1[2] + (color2[2] - color1[2]) * ratio))),
  ];
}

/**
 * Calculate dynamic mix ratio based on Lab luminance difference between two colors.
 * This creates visually balanced state colors regardless of the base color.
 *
 * @param foreground - The foreground/mix color RGB
 * @param background - The background color RGB
 * @returns Mix ratio (0-1)
 */
function calculateMixRatio(foreground: RGB, background: RGB): number {
  const fgLuminance = getLabLuminance(foreground);
  const bgLuminance = getLabLuminance(background);

  const minRatio = 0.05;
  // Base ratio calculation based on luminance difference
  const baseRatio = ((1 - (bgLuminance - fgLuminance)) / 2) * (0.18 - minRatio) + minRatio;

  // Adjustment factor based on absolute luminance difference
  const luminanceSimilarity = 1 - Math.abs(bgLuminance - fgLuminance);
  const adjustment = ((1 - baseRatio) * luminanceSimilarity) ** 4;

  const finalRatio = baseRatio + adjustment;
  return Math.round(finalRatio * 1000) / 1000;
}

/**
 * Generate hover and active state colors based on background and foreground colors.
 *
 * Algorithm:
 * 1. Calculate dynamic mix ratio based on Lab luminance difference
 * 2. Hover = background mixed with foreground at calculated ratio
 * 3. Active = background mixed with foreground (or its inverse) at 2x ratio
 * 4. For mid-tone backgrounds (lightness 0.2-0.8), active uses inverted foreground
 *    to create more distinct visual feedback
 *
 * @param backgroundColor - The base background color (hex)
 * @param foregroundColor - The foreground/brand color to mix with (hex)
 * @returns Object containing hover and active color hex strings
 *
 * @example
 * // Brand color button (green on green)
 * generateStateColors('#65a30d', '#f8fafc');
 * // Returns: { hover: '#86b643', active: '#5c940c' }
 *
 * @example
 * // White background with blue brand
 * generateStateColors('#ffffff', '#155eef');
 * // Returns: { hover: '#e6eefd', active: '#ccdcfc' }
 *
 * @example
 * // Pink background with green brand
 * generateStateColors('#fecaca', '#65a30d');
 * // Returns: { hover: '#cfbe90', active: '#a0b256' }
 *
 * @example
 * // Green background with green brand (uses inverse for active)
 * generateStateColors('#4ade80', '#65a30d');
 * // Returns: { hover: '#55c753', active: '#61b8a1' }
 */
export function generateStateColors(
  backgroundColor: string,
  foregroundColor: string,
): { hover: string; active: string } {
  const bgRgb = hexToRgb(backgroundColor);
  const fgRgb = hexToRgb(foregroundColor);
  const bgHsl = rgbToHsl(bgRgb);

  // Calculate hover ratio based on luminance
  const hoverRatio = calculateMixRatio(fgRgb, bgRgb);

  // Active ratio is typically 2x hover ratio
  let activeRatio = hoverRatio * 2;
  let activeMixColor = fgRgb;

  // For mid-tone backgrounds, use inverted color for active state
  // This creates better visual distinction
  const midToneThreshold = 0.2;
  if (bgHsl[2] > midToneThreshold && bgHsl[2] < 1 - midToneThreshold) {
    activeMixColor = invertColor(fgRgb);
    activeRatio = calculateMixRatio(activeMixColor, bgRgb);
  }

  const hoverRgb = mixRgb(bgRgb, fgRgb, hoverRatio);
  const activeRgb = mixRgb(bgRgb, activeMixColor, activeRatio);

  return {
    hover: rgbToHex(hoverRgb),
    active: rgbToHex(activeRgb),
  };
}
