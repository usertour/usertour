import chroma from 'chroma-js';

export const hslToHex = (hsl: { h: number; s: number; l: number }): string => {
  const { h, s, l } = hsl;

  const hDecimal = l / 100;
  const a = (s * Math.min(hDecimal, 1 - hDecimal)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = hDecimal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

    // Convert to Hex and prefix with "0" if required
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
//   const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

//   if (!result) {
//     throw new Error("Could not parse Hex Color");
//   }

//   const rHex = parseInt(result[1], 16);
//   const gHex = parseInt(result[2], 16);
//   const bHex = parseInt(result[3], 16);

//   const r = rHex / 255;
//   const g = gHex / 255;
//   const b = bHex / 255;

//   const max = Math.max(r, g, b);
//   const min = Math.min(r, g, b);

//   let h = (max + min) / 2;
//   let s = h;
//   let l = h;

//   if (max === min) {
//     // Achromatic
//     return { h: 0, s: 0, l };
//   }

//   const d = max - min;
//   s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
//   switch (max) {
//     case r:
//       h = (g - b) / d + (g < b ? 6 : 0);
//       break;
//     case g:
//       h = (b - r) / d + 2;
//       break;
//     case b:
//       h = (r - g) / d + 4;
//       break;
//   }
//   h /= 6;

//   s = s * 100;
//   s = Math.round(s);
//   l = l * 100;
//   l = Math.round(l);
//   h = Math.round(360 * h);

//   return { h, s, l };
// };

export function hexToHSL(hexColor: string): [number, string, string] {
  try {
    const color = chroma(hexColor);
    const [h, s, l] = color.hsl();

    // Convert to degrees and percentages
    const hDeg = Math.round(h || 0);
    const sPct = Math.round(s * 100);
    const lPct = Math.round(l * 100);

    return [hDeg, `${sPct}%`, `${lPct}%`];
  } catch (error) {
    console.warn(`Failed to convert ${hexColor} to HSL:`, error);
    return [0, '0%', '0%']; // Fallback to black
  }
}

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

export const changeColor = (color: string, amount: number) => {
  // #FFF not supportet rather use #FFFFFF
  const clamp = (val: number) => Math.min(Math.max(val, 0), 0xff);
  const fill = (str: string) => `00${str}`.slice(-2);

  const num = Number.parseInt(color.substr(1), 16);
  const red = clamp((num >> 16) + amount);
  const green = clamp(((num >> 8) & 0x00ff) + amount);
  const blue = clamp((num & 0x0000ff) + amount);
  return `#${fill(red.toString(16))}${fill(green.toString(16))}${fill(blue.toString(16))}`;
};

/**
 * Adjust color for hover and active states using chroma.js
 * @param color - Hex color string (e.g., "#FFFFFF")
 * @param type - "hover" or "active"
 * @returns Adjusted hex color
 */
export const adjustColorForState = (color: string, type: 'hover' | 'active'): string => {
  try {
    const chromaColor = chroma(color);
    const luminance = chromaColor.luminance();

    // Determine adjustment based on luminance and state
    let adjustment: number;
    if (type === 'hover') {
      adjustment = luminance > 0.5 ? -0.15 : 0.15; // Darken light colors, lighten dark colors
    } else {
      // active
      adjustment = luminance > 0.5 ? -0.3 : 0.3; // More dramatic change for active
    }

    return chromaColor.luminance(Math.max(0, Math.min(1, luminance + adjustment))).hex();
  } catch (error) {
    // Fallback to original color if chroma.js fails to parse
    console.warn(`Failed to adjust color ${color}:`, error);
    return color;
  }
};

/**
 * Generate hover and active colors for a given base color using chroma.js
 * @param color - Base hex color
 * @returns Object with hover and active colors
 */
export const generateStateColors = (color: string) => {
  return {
    hover: adjustColorForState(color, 'hover'),
    active: adjustColorForState(color, 'active'),
  };
};

/**
 * Get the most readable text color for a given background color
 * @param backgroundColor - Background color in hex format
 * @returns Black or white hex color
 */
export const getReadableTextColor = (backgroundColor: string): string => {
  try {
    const bgColor = chroma(backgroundColor);
    return bgColor.luminance() > 0.5 ? '#000000' : '#FFFFFF';
  } catch (error) {
    console.warn(`Failed to get readable color for ${backgroundColor}:`, error);
    return '#000000'; // Fallback to black
  }
};

/**
 * Check if two colors have sufficient contrast for accessibility
 * @param color1 - First color in hex format
 * @param color2 - Second color in hex format
 * @param ratio - Minimum contrast ratio (default: 4.5 for AA standard)
 * @returns Boolean indicating if contrast is sufficient
 */
export const hasSufficientContrast = (color1: string, color2: string, ratio = 4.5): boolean => {
  try {
    return chroma.contrast(color1, color2) >= ratio;
  } catch (error) {
    console.warn(`Failed to check contrast between ${color1} and ${color2}:`, error);
    return false;
  }
};

/**
 * Generate a color palette from a base color
 * @param baseColor - Base color in hex format
 * @param count - Number of colors in palette (default: 5)
 * @returns Array of hex colors
 */
export const generateColorPalette = (baseColor: string, count = 5): string[] => {
  try {
    const color = chroma(baseColor);
    const palette = chroma
      .scale([color.darken(2), color, color.brighten(2)])
      .mode('lab')
      .colors(count);

    return palette.map((c: any) => chroma(c).hex());
  } catch (error) {
    console.warn(`Failed to generate palette for ${baseColor}:`, error);
    return Array(count).fill(baseColor);
  }
};

/**
 * Blend two colors together
 * @param color1 - First color in hex format
 * @param color2 - Second color in hex format
 * @param weight - Weight of color2 (0-1, default: 0.5)
 * @returns Blended hex color
 */
export const blendColors = (color1: string, color2: string, weight = 0.5): string => {
  try {
    return chroma.mix(color1, color2, weight, 'rgb').hex();
  } catch (error) {
    console.warn(`Failed to blend colors ${color1} and ${color2}:`, error);
    return color1; // Fallback to first color
  }
};

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
 * Convert hex color to RGB/RGBA CSS format (e.g., "rgb(255, 255, 255)" or "rgba(255, 255, 255, 0.5)")
 * @param hex - Hex color string (e.g., "#FFFFFF" or "#FFFFFF80")
 * @returns RGB/RGBA CSS format
 */
export const hexToRGB = (hex: string): string => {
  try {
    const color = chroma(hex);
    const [r, g, b, a] = color.rgba();

    if (a === 1) {
      return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
  } catch (error) {
    console.warn(`Failed to convert ${hex} to RGB:`, error);
    return 'rgb(0, 0, 0)'; // Fallback to black
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
