import type { ReactNode } from 'react';
import {
  sidebarBodyClass,
  sidebarFooterClass,
  sidebarHeaderClass,
  sidebarPanelClass,
  sidebarPanelRightClass,
} from '../ui/tokens';

interface Props {
  width: number;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  variant?: 'left' | 'right';
}

export function SidebarShell({ width, header, footer, children, variant = 'left' }: Props) {
  const panelClass = variant === 'right' ? sidebarPanelRightClass : sidebarPanelClass;
  return (
    <div className={panelClass} style={{ width }}>
      {header && <div className={sidebarHeaderClass}>{header}</div>}
      <div className={sidebarBodyClass}>{children}</div>
      {footer && <div className={sidebarFooterClass}>{footer}</div>}
    </div>
  );
}
