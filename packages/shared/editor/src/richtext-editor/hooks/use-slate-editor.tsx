import { useCallback, useMemo, useState } from 'react';
import type { Descendant } from 'slate';
import { createEditor } from 'slate';
import { withHistory } from 'slate-history';
import type { RenderElementProps, RenderLeafProps } from 'slate-react';
import { withReact } from 'slate-react';
import { withAlignReset } from '../../lib/withAlignReset';
import { withLink } from '../../lib/withLink';
import { withUserAttribute } from '../../lib/withUserAttribute';
import type { PopperEditorContextProps, PopperEditorProps } from '../../types/editor';

/**
 * Options for configuring the Slate editor
 */
export interface UseSlateEditorOptions {
  /** Whether to include link plugin (default: true) */
  withLinks?: boolean;
  /** Callback when editor value changes */
  onValueChange?: (value: Descendant[]) => void;
  /** z-index for context */
  zIndex?: number;
  /** Custom upload request handler */
  customUploadRequest?: PopperEditorProps['customUploadRequest'];
  /** User attributes for the editor */
  attributes?: PopperEditorProps['attributes'];
  /** Element renderer component */
  ElementComponent: React.ComponentType<RenderElementProps>;
  /** Leaf renderer component */
  LeafComponent: React.ComponentType<RenderLeafProps>;
}

/**
 * Return type for the useSlateEditor hook
 */
export interface UseSlateEditorReturn {
  /** The Slate editor instance */
  editor: ReturnType<typeof createEditor>;
  /** Whether mouse is hovering over editor */
  isEditorHover: boolean;
  /** Set editor hover state */
  setIsEditorHover: React.Dispatch<React.SetStateAction<boolean>>;
  /** Ref to the editor container element */
  editorRef: HTMLDivElement | null;
  /** Set the editor container ref */
  setEditorRef: React.Dispatch<React.SetStateAction<HTMLDivElement | null>>;
  /** Handler for Slate onChange - filters selection-only changes */
  handleSlateChange: (value: Descendant[]) => void;
  /** Memoized context value for PopperEditorContext */
  contextValue: PopperEditorContextProps;
  /** Memoized mouse enter handler */
  handleMouseEnter: () => void;
  /** Memoized mouse leave handler */
  handleMouseLeave: () => void;
  /** Memoized renderElement callback */
  renderElement: (props: RenderElementProps) => JSX.Element;
  /** Memoized renderLeaf callback */
  renderLeaf: (props: RenderLeafProps) => JSX.Element;
}

/**
 * Custom hook for creating and managing a Slate editor instance
 * Handles common logic for PopperEditor and PopperEditorMini
 */
export const useSlateEditor = (options: UseSlateEditorOptions): UseSlateEditorReturn => {
  const {
    withLinks = true,
    onValueChange,
    zIndex = 0,
    customUploadRequest,
    attributes,
    ElementComponent,
    LeafComponent,
  } = options;

  // Create editor instance with plugins (memoized)
  const editor = useMemo(() => {
    const baseEditor = withHistory(withAlignReset(withUserAttribute(withReact(createEditor()))));
    return withLinks ? withLink(baseEditor) : baseEditor;
  }, [withLinks]);

  // Editor state
  const [isEditorHover, setIsEditorHover] = useState(false);
  const [editorRef, setEditorRef] = useState<HTMLDivElement | null>(null);

  // Memoized render callbacks
  const renderElement = useCallback(
    (props: RenderElementProps) => <ElementComponent {...props} />,
    [ElementComponent],
  );
  const renderLeaf = useCallback(
    (props: RenderLeafProps) => <LeafComponent {...props} />,
    [LeafComponent],
  );

  // Handler for value changes (called by parent's onChange)
  const handleValueChange = useCallback(
    (value: Descendant[]) => {
      onValueChange?.(value);
    },
    [onValueChange],
  );

  // Handler for Slate onChange - filters out selection-only changes
  const handleSlateChange = useCallback(
    (value: Descendant[]) => {
      const isAstChange = editor.operations.some((op) => op.type !== 'set_selection');
      if (isAstChange) {
        handleValueChange(value);
      }
    },
    [editor, handleValueChange],
  );

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(
    (): PopperEditorContextProps => ({
      zIndex,
      container: editorRef,
      isEditorHover,
      customUploadRequest,
      setIsEditorHover,
      attributes,
    }),
    [zIndex, editorRef, isEditorHover, customUploadRequest, attributes],
  );

  // Memoize mouse event handlers
  const handleMouseEnter = useCallback(() => setIsEditorHover(true), []);
  const handleMouseLeave = useCallback(() => setIsEditorHover(false), []);

  return {
    editor,
    isEditorHover,
    setIsEditorHover,
    editorRef,
    setEditorRef,
    handleSlateChange,
    contextValue,
    handleMouseEnter,
    handleMouseLeave,
    renderElement,
    renderLeaf,
  };
};
