import { Button, type ButtonProps } from '@usertour-packages/button';
import { RiArrowRightSLine, RiMoreFill } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import { Fragment, forwardRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
  className?: string;
}

interface SectionBreadcrumbHeaderProps {
  items: BreadcrumbItem[];
  menu?: ReactNode;
  className?: string;
}

// Lightweight breadcrumb header for sidebar-inner detail pages (user / company
// / session detail). It deliberately reads as a region marker rather than a
// global top bar — no heavy surface, just a hairline border to separate from
// the content scroll. h-14 keeps it level with content-detail's richer header
// so users don't see the top bar height jump when they navigate between
// detail pages. The last breadcrumb item is treated as the current page
// (medium weight, no link); everything before it gets the muted-link
// treatment.
export function SectionBreadcrumbHeader({ items, menu, className }: SectionBreadcrumbHeaderProps) {
  return (
    <div className={cn('sticky top-0 z-10 border-b border-border/50 bg-background', className)}>
      <div className="flex h-14 w-full min-w-0 items-center gap-2 px-4">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const baseClass = 'min-w-0 truncate text-sm';
          const labelClass = isLast
            ? cn(baseClass, 'font-medium text-foreground', item.className)
            : cn(
                baseClass,
                'text-muted-foreground transition-colors',
                item.to && 'hover:text-foreground',
                item.className,
              );

          return (
            <Fragment key={index}>
              {index > 0 && (
                <RiArrowRightSLine className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              )}
              {item.to && !isLast ? (
                <Link to={item.to} className={labelClass}>
                  {item.label}
                </Link>
              ) : (
                <span className={labelClass}>{item.label}</span>
              )}
            </Fragment>
          );
        })}
        {menu && <div className="ml-auto shrink-0">{menu}</div>}
      </div>
    </div>
  );
}

SectionBreadcrumbHeader.displayName = 'SectionBreadcrumbHeader';

// Standard "more actions" trigger button for detail headers. Centralizing it
// here means every consumer (BreadcrumbHeader menus, the eventual
// content-detail header cleanup, future detail pages) agrees on the same
// 32px ghost icon button rather than each rolling its own.
export const MoreButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <Button ref={ref} type="button" variant="ghost" size="icon-sm" className={className} {...props}>
      <RiMoreFill className="h-4 w-4" />
    </Button>
  ),
);
MoreButton.displayName = 'MoreButton';
