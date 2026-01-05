import { isUndefined } from '@usertour/helpers';
import { AttributeDataType } from '@usertour/types';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Capitalize the first letter of a word
 * @param word - The word to capitalize
 * @returns The word with the first letter capitalized
 */
export const firstLetterToUpperCase = (word: string): string => {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
};

// Threshold for showing compact format (numbers >= 10000 will be compacted)
const COMPACT_THRESHOLD = 10000;

/**
 * Format a number to compact notation (e.g., 1.2K, 3.4M, 5.6B)
 * Only applies to numbers >= 10000, smaller numbers are shown in full with locale formatting
 */
export const formatCompactNumber = (num: number): string => {
  if (num < COMPACT_THRESHOLD) {
    return num.toLocaleString('en-US');
  }
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
};

/**
 * Check if a number should display a tooltip with the full value
 */
export const shouldShowFullNumberTooltip = (num: number): boolean => {
  return num >= COMPACT_THRESHOLD;
};

// Utility function to format different data types for display based on AttributeDataType
export const formatAttributeValue = (value: any, dataType: number): string => {
  if (isUndefined(value) || isUndefined(dataType)) {
    return '';
  }

  switch (dataType) {
    case AttributeDataType.Number:
      return typeof value === 'number' ? value.toString() : `${value}`;
    case AttributeDataType.String:
      return `${value}`;
    case AttributeDataType.Boolean:
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }
      // Handle string representations of boolean
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'true' || lowerValue === '1') {
          return 'true';
        }
        if (lowerValue === 'false' || lowerValue === '0') {
          return 'false';
        }
      }
      return `${value}`;
    case AttributeDataType.List:
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      // Handle string representation of list
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed.join(', ');
          }
        } catch {
          // If parsing fails, treat as comma-separated string
          return value;
        }
      }
      return `${value}`;
    case AttributeDataType.DateTime:
      if (value instanceof Date) {
        return `${formatDistanceToNow(value)} ago`;
      }
      if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          return `${formatDistanceToNow(date)} ago`;
        }
      }
      return `${value}`;
    case AttributeDataType.RandomAB:
    case AttributeDataType.RandomNumber:
      return `${value}`;
    default:
      return `${value}`;
  }
};
