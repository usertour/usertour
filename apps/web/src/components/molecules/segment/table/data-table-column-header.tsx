import { cn } from '@usertour-packages/tailwind';
import { DataTableColumnHeaderProps } from './types';

export function DataTableColumnHeader({ title, className }: DataTableColumnHeaderProps) {
  return <div className={cn(className)}>{title}</div>;
}
