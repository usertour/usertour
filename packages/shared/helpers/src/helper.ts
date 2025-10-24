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
