import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 } from 'uuid';
import { createId } from '@paralleldrive/cuid2';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export const isDark = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return null;
  }
  const { r, g, b } = rgb;
  if (r * 0.299 + g * 0.587 + b * 0.114 > 186) {
    return true;
  }
  return false;
};

export const evalCode = (code: string) => {
  // biome-ignore lint/security/noGlobalEval: <explanation>
  return eval(code);
};
