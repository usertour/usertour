import { isUndefined } from '@usertour-packages/utils';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility function to format different data types for display
export const formatAttributeValue = (value: any): string => {
  if (isUndefined(value)) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'object' && Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return format(new Date(value), 'PPpp');
  }

  return `${value}`;
};
