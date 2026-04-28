import type { ReactNode } from 'react';
import {
  sidebarBodyClass,
  sidebarFooterClass,
  sidebarHeaderClass,
  sidebarPanelClass,
  sidebarPanelRightClass,
} from '../ui/tokens';
import { SidebarResizeHandle } from './sidebar-resize-handle';

interface Props {
  width: number;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  variant?: 'left' | 'right';
  // When provided, renders a drag handle on the inner edge (right edge for
  // left-variant, left edge for right-variant).
  resize?: {
    isResizing: boolean;
    isAtMin: boolean;
    onMouseDown: (event: React.MouseEvent) => void;
  };
}

export function SidebarShell({ width, header, footer, children, variant = 'left', resize }: Props) {
  const panelClass = variant === 'right' ? sidebarPanelRightClass : sidebarPanelClass;
  const handleEdge = variant === 'right' ? 'left' : 'right';
  return (
    <div className={panelClass} style={{ width }}>
      {header && <div className={sidebarHeaderClass}>{header}</div>}
      <div className={sidebarBodyClass}>{children}</div>
      {footer && <div className={sidebarFooterClass}>{footer}</div>}
      {resize && (
        <SidebarResizeHandle
          edge={handleEdge}
          isResizing={resize.isResizing}
          isAtMin={resize.isAtMin}
          onMouseDown={resize.onMouseDown}
        />
      )}
    </div>
  );
}
