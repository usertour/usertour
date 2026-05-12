import { useCallback } from 'react';
import { useSlate } from 'slate-react';

import { getTextProps, toggleTextProps } from '../../../lib/text';
import type { TextFormat } from '../../../types/slate';
import type { UseMarkFormatReturn } from '../toolbar.types';

/**
 * Check if a text mark (bold, italic, etc.) is currently active
 */
const isMarkActive = (editor: ReturnType<typeof useSlate>, format: TextFormat): boolean => {
  return !!getTextProps(editor, format);
};

/**
 * Hook to manage mark format state and toggle functionality
 */
export const useMarkFormat = (format: TextFormat): UseMarkFormatReturn => {
  const editor = useSlate();

  const isActive = isMarkActive(editor, format);

  const toggle = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      toggleTextProps(editor, format);
    },
    [editor, format],
  );

  return { isActive, toggle };
};

// Export utility for external use
export { isMarkActive };
