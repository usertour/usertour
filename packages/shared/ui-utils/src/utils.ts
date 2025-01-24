import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 } from "uuid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input: string | number): string {
  const date = new Date(input);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function absoluteUrl(path: string) {
  return `${path}`;
}

export const uuidV4 = () => {
  return v4();
};

export function hexToRgb(hex: string) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
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
  return eval(code);
};
