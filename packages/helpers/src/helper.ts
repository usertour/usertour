import { v4 } from 'uuid';
import { createId } from '@paralleldrive/cuid2';

export const cuid = () => {
  return createId();
};

export function formatDate(input: string | number): string {
  const date = new Date(input);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function absoluteUrl(path: string) {
  return `${path}`;
}

export const uuidV4 = () => {
  return v4();
};

export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null;
}

export const evalCode = (code: string) => {
  try {
    // biome-ignore lint/security/noGlobalEval: <explanation>
    return eval(code);
  } catch (error) {
    console.error('Usertour.js: Error evaluating code:', error);
    return null; // Return null instead of throwing
  }
};

// Generate random color for avatar fallback
export const getRandomColor = () => {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-teal-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-rose-500',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Check if a color needs dark text for readability.
 * Uses standard luminance formula: 0.299*R + 0.587*G + 0.114*B
 * @param hex - Hex color string
 * @returns true if background is light and needs dark text
 */
export const needsDarkText = (hex: string): boolean => {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return false; // Invalid color defaults to dark background (white text)
  }
  const { r, g, b } = rgb;
  // Standard threshold 186: ensures text readability
  return r * 0.299 + g * 0.587 + b * 0.114 > 186;
};

/**
 * Check if a color is very close to white (needs gray border).
 * @param hex - Hex color string
 * @returns true only for colors very close to white
 */
export const isNearWhite = (hex: string): boolean => {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return false; // Invalid color defaults to no special border
  }
  const { r, g, b } = rgb;
  // Threshold 245: includes slate-50 (#F8FAFC) and similar very light colors
  return r * 0.299 + g * 0.587 + b * 0.114 > 245;
};

/**
 * Capitalize the first letter of a word
 * @param word - The word to capitalize
 * @returns The word with the first letter capitalized
 */
export const firstLetterToUpperCase = (word: string): string => {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
};
