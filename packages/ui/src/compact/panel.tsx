import type { ReactNode } from 'react';
import { ResizeHandle } from './resize-handle';
import { bodyClass, footerClass, headerClass, panelClass, panelRightClass } from './tokens';

export interface CompactPanelProps {
  width: number;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  variant?: 'left' | 'right';
  // When provided, renders a drag handle on the inner edge (right edge for
  // left-variant, left edge for right-variant).
  resize?: {
    isAtMin: boolean;
    onMouseDown: (event: React.MouseEvent) => void;
    // Accessible label for the resize handle, passed through. Defaults are
    // applied at the handle level when omitted.
    ariaLabel?: string;
  };
}

// Sidebar / inspector chrome — header / body / footer regions stacked
// vertically, optional drag-to-resize handle on the inner edge.
export const CompactPanel = (props: CompactPanelProps) => {
  const { width, header, footer, children, variant = 'left', resize } = props;
  const className = variant === 'right' ? panelRightClass : panelClass;
  const handleEdge = variant === 'right' ? 'left' : 'right';
  return (
    <div className={className} style={{ width }}>
      {header && <div className={headerClass}>{header}</div>}
      <div className={bodyClass}>{children}</div>
      {footer && <div className={footerClass}>{footer}</div>}
      {resize && (
        <ResizeHandle
          edge={handleEdge}
          isAtMin={resize.isAtMin}
          onMouseDown={resize.onMouseDown}
          ariaLabel={resize.ariaLabel}
        />
      )}
    </div>
  );
};
