import { cn } from '@usertour/tailwind';
import { DataTableColumnHeaderProps } from './types';

export function DataTableColumnHeader({ title, className }: DataTableColumnHeaderProps) {
  return <div className={cn(className)}>{title}</div>;
}
