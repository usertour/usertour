import { useFloating, offset, flip, shift } from '@floating-ui/react-dom';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Range } from 'slate';
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
 * Hook to manage floating toolbar positioning based on Slate selection
 * Similar to Tiptap's floating menu implementation
 */
export const useFloatingToolbar = () => {
  // Use useSlate instead of useSlateStatic to subscribe to editor changes
  // This ensures the hook re-runs when selection changes
  const editor = useSlate();
  const [isVisible, setIsVisible] = useState(false);
  const [virtualElement, setVirtualElement] = useState<VirtualElement | null>(null);
  const domRangeRef = useRef<Range | null>(null);

  // Serialize selection for dependency tracking
  // This ensures useLayoutEffect runs when selection actually changes
  const selectionKey = useMemo(() => {
    const currentSelection = editor.selection;
    return currentSelection
      ? `${currentSelection.anchor.path.join(',')}-${currentSelection.anchor.offset}-${currentSelection.focus.path.join(',')}-${currentSelection.focus.offset}`
      : 'null';
  }, [editor.selection]);

  // Update selection state when editor selection changes
  // useSlate will trigger re-render when editor state changes (including selection)
  // Use useLayoutEffect for faster response (runs synchronously before paint)
  useLayoutEffect(() => {
    const currentSelection = editor.selection;

    // Check if selection exists and is not collapsed (has actual text selected)
    const hasSelection = currentSelection && !Range.isCollapsed(currentSelection);

    if (hasSelection) {
      try {
        // Get DOM range from Slate selection
        const domRange = ReactEditor.toDOMRange(editor, currentSelection);
        if (domRange) {
          domRangeRef.current = currentSelection;
          // Create a virtual reference element from the DOM range
          const rect = domRange.getBoundingClientRect();
          if (rect.width > 0 || rect.height > 0) {
            // Create virtual element with getBoundingClientRect
            // Store the original domRange for recalculation
            const originalDomRange = domRange;
            const virtualEl: VirtualElement = {
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
            setVirtualElement(virtualEl);
            setIsVisible(true);
          } else {
            setIsVisible(false);
            setVirtualElement(null);
            domRangeRef.current = null;
          }
        } else {
          setIsVisible(false);
          setVirtualElement(null);
          domRangeRef.current = null;
        }
      } catch {
        // Selection might be invalid, hide toolbar
        setIsVisible(false);
        setVirtualElement(null);
        domRangeRef.current = null;
      }
    } else {
      setIsVisible(false);
      setVirtualElement(null);
      domRangeRef.current = null;
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
