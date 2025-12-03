import { isUndefined } from '@usertour/helpers';
import { AttributeDataType } from '@usertour/types';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility function to format different data types for display based on AttributeDataType
export const formatAttributeValue = (
  value: any,
  dataType: number,
  predefined?: boolean,
): string => {
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
      // Only format predefined attributes, show raw data for non-predefined
      if (predefined) {
        if (value instanceof Date) {
          return `${formatDistanceToNow(value)} ago`;
        }
        if (typeof value === 'string' || typeof value === 'number') {
          const date = new Date(value);
          if (!Number.isNaN(date.getTime())) {
            return `${formatDistanceToNow(date)} ago`;
          }
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
