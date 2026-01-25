import { useFloating, offset, flip, shift } from '@floating-ui/react-dom';
import type React from 'react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Editor, BaseRange } from 'slate';
import { Range as SlateRange } from 'slate';
import { ReactEditor, useSlate } from 'slate-react';

/**
 * Virtual element type for Floating UI
 */
type VirtualElement = {
  getBoundingClientRect: () => DOMRect;
  getClientRects?: () => DOMRectList;
  contextElement?: Element;
};

/**
 * Type alias for Slate Range to avoid conflict with DOM Range
 */
type SlateSelection = BaseRange;

/**
 * Helper function to clear toolbar state
 */
const clearToolbarState = (
  setIsVisible: (value: boolean) => void,
  setVirtualElement: (value: VirtualElement | null) => void,
  domRangeRef: React.MutableRefObject<SlateSelection | null>,
) => {
  setIsVisible(false);
  setVirtualElement(null);
  domRangeRef.current = null;
};

/**
 * Helper function to create a virtual element from DOM range
 */
const createVirtualElement = (
  domRange: globalThis.Range,
  editor: Editor,
  domRangeRef: React.MutableRefObject<SlateRange | null>,
): VirtualElement => {
  const originalDomRange = domRange;
  const rect = domRange.getBoundingClientRect();

  return {
    getBoundingClientRect: () => {
      // Recalculate rect from current Slate selection
      if (domRangeRef.current) {
        try {
          const currentDomRange = ReactEditor.toDOMRange(editor, domRangeRef.current);
          if (currentDomRange) {
            return currentDomRange.getBoundingClientRect();
          }
        } catch {
          // Fallback to original rect if recalculation fails
        }
      }
      return rect;
    },
    getClientRects: () => {
      // Recalculate client rects from current Slate selection
      if (domRangeRef.current) {
        try {
          const currentDomRange = ReactEditor.toDOMRange(editor, domRangeRef.current);
          if (currentDomRange) {
            return currentDomRange.getClientRects();
          }
        } catch {
          // Fallback to original rects if recalculation fails
        }
      }
      return originalDomRange.getClientRects();
    },
    contextElement: originalDomRange.commonAncestorContainer as Element,
  };
};

/**
 * Hook to manage floating toolbar positioning based on Slate selection
 * Similar to Tiptap's floating menu implementation
 */
export const useFloatingToolbar = () => {
  // Use useSlate instead of useSlateStatic to subscribe to editor changes
  // This ensures the hook re-runs when selection changes
  const editor = useSlate();
  const [isVisible, setIsVisible] = useState(false);
  const [virtualElement, setVirtualElement] = useState<VirtualElement | null>(null);
  const domRangeRef = useRef<SlateSelection | null>(null);

  // Serialize selection for dependency tracking
  // This ensures useLayoutEffect runs when selection actually changes
  // Note: useSlate already triggers re-render on selection change, but we serialize
  // to ensure the effect runs even if the object reference doesn't change
  const selectionKey = useMemo(() => {
    const currentSelection = editor.selection;
    if (!currentSelection) {
      return 'null';
    }
    return `${currentSelection.anchor.path.join(',')}-${currentSelection.anchor.offset}-${currentSelection.focus.path.join(',')}-${currentSelection.focus.offset}`;
  }, [editor.selection]);

  // Update selection state when editor selection changes
  // useSlate will trigger re-render when editor state changes (including selection)
  // Use useLayoutEffect for faster response (runs synchronously before paint)
  useLayoutEffect(() => {
    const currentSelection = editor.selection;

    // Check if selection exists and is not collapsed (has actual text selected)
    const hasSelection = currentSelection && !SlateRange.isCollapsed(currentSelection);

    if (!hasSelection) {
      clearToolbarState(setIsVisible, setVirtualElement, domRangeRef);
      return;
    }

    try {
      // Get DOM range from Slate selection
      const domRange = ReactEditor.toDOMRange(editor, currentSelection);
      if (!domRange) {
        clearToolbarState(setIsVisible, setVirtualElement, domRangeRef);
        return;
      }

      // Check if the range has valid dimensions
      const rect = domRange.getBoundingClientRect();
      if (rect.width <= 0 && rect.height <= 0) {
        clearToolbarState(setIsVisible, setVirtualElement, domRangeRef);
        return;
      }

      // Store current selection and create virtual element
      domRangeRef.current = currentSelection;
      const virtualEl = createVirtualElement(domRange, editor, domRangeRef);
      setVirtualElement(virtualEl);
      setIsVisible(true);
    } catch {
      // Selection might be invalid, hide toolbar
      clearToolbarState(setIsVisible, setVirtualElement, domRangeRef);
    }
    // Use serialized selection key to track selection changes
  }, [editor, selectionKey]);

  // Use Floating UI for positioning
  const { refs, floatingStyles, placement, update } = useFloating({
    strategy: 'fixed',
    placement: 'top',
    middleware: [
      offset(8), // 8px gap between selection and toolbar
      flip(), // Flip to bottom if not enough space above
      shift({ padding: 8 }), // Shift horizontally to stay in viewport
    ],
    // Don't use whileElementsMounted - we'll manually update when needed
  });

  // Update reference element and position when virtual element changes
  // Use useLayoutEffect for faster response
  useLayoutEffect(() => {
    if (virtualElement) {
      refs.setReference(virtualElement);
      // Update position immediately after setting reference (synchronous)
      update?.();
    } else {
      refs.setReference(null);
    }
  }, [virtualElement, refs, update]);

  return {
    isVisible,
    floatingStyles,
    placement,
    refs,
  };
};
