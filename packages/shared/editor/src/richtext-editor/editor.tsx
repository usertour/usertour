'use client';

import { cn } from '@usertour-packages/tailwind';
import isHotkey from 'is-hotkey';
import React, { useCallback } from 'react';
import { Editor, Element as SlateElement, Path, Transforms } from 'slate';
import { Editable, RenderElementProps, RenderLeafProps, Slate } from 'slate-react';
import { getTextStyles } from '../lib/styles';
import { toggleTextProps } from '../lib/text';
import { PopperEditorContextProps, PopperEditorProps } from '../types/editor';
import { ELEMENTS } from './elements';
import { useSlateEditor } from './hooks';
import { EditorToolbar, UserAttrButton } from './toolbar';
import { SlashCommandEditableWrapper } from './toolbar/components/slash-command-editable-wrapper';

const HOTKEYS: Record<string, string> = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
};

/**
 * Handle Enter key in code blocks
 * - Cmd/Ctrl+Enter: Exit code block and create new paragraph
 * - Regular Enter: Insert newline within code block
 * @returns true if the event was handled
 */
const handleCodeBlockEnter = (editor: Editor, event: React.KeyboardEvent): boolean => {
  if (event.key !== 'Enter') return false;

  const [codeBlock] = Editor.nodes(editor, {
    match: (n) => SlateElement.isElement(n) && n.type === 'code',
  });

  if (!codeBlock) return false;

  event.preventDefault();

  if (event.metaKey || event.ctrlKey) {
    // Exit code block: insert paragraph after and move cursor
    const [, codePath] = codeBlock;
    Transforms.insertNodes(
      editor,
      { type: 'paragraph', children: [{ text: '' }] },
      { at: Path.next(codePath) },
    );
    Transforms.select(editor, Path.next(codePath));
  } else {
    // Insert newline within code block
    editor.insertText('\n');
  }

  return true;
};

/**
 * Handle Enter key in list items
 * - If list item is empty, exit list and create paragraph
 * - Otherwise, let Slate handle default behavior (create new list item)
 * @returns true if the event was handled
 */
const handleListEnter = (editor: Editor, event: React.KeyboardEvent): boolean => {
  if (event.key !== 'Enter') return false;

  const [listItem] = Editor.nodes(editor, {
    match: (n) => SlateElement.isElement(n) && n.type === 'list-item',
  });

  if (!listItem) return false;

  const text = Editor.string(editor, listItem[1]);
  const isEmpty = text.trim() === '';

  // If list item is empty, exit list and create paragraph
  if (isEmpty) {
    event.preventDefault();

    // Unwrap parent list and convert to paragraph
    Transforms.unwrapNodes(editor, {
      match: (n) =>
        SlateElement.isElement(n) && (n.type === 'bulleted-list' || n.type === 'numbered-list'),
      split: true,
    });
    Transforms.setNodes(editor, { type: 'paragraph' });

    return true;
  }

  // Let Slate handle default behavior (create new list item)
  return false;
};

/**
 * Handle Enter key in headings (h1, h2)
 * - Always create paragraph instead of another heading
 * @returns true if the event was handled
 */
const handleHeadingEnter = (editor: Editor, event: React.KeyboardEvent): boolean => {
  if (event.key !== 'Enter') return false;

  const [heading] = Editor.nodes(editor, {
    match: (n) => SlateElement.isElement(n) && (n.type === 'h1' || n.type === 'h2'),
  });

  if (!heading) return false;

  event.preventDefault();
  const [, headingPath] = heading;

  // Insert paragraph after heading
  Transforms.insertNodes(
    editor,
    { type: 'paragraph', children: [{ text: '' }] },
    { at: Path.next(headingPath) },
  );
  Transforms.select(editor, Path.next(headingPath));

  return true;
};

/**
 * Handle text formatting hotkeys (bold, italic, underline, code)
 */
const handleFormattingHotkeys = (editor: Editor, event: React.KeyboardEvent): void => {
  for (const hotkey in HOTKEYS) {
    if (isHotkey(hotkey, event as React.KeyboardEvent<Element>)) {
      event.preventDefault();
      toggleTextProps(editor, HOTKEYS[hotkey]);
      return;
    }
  }
};

export const ALIGN_MAPPING: Record<string, string> = {
  right: 'text-right',
  left: 'text-left',
  center: 'text-center',
  justify: 'text-justify',
};

/**
 * Element renderer for Slate editor
 */
const Element = (props: RenderElementProps) => {
  const { element, children } = props;
  const cls = 'align' in element ? ALIGN_MAPPING[element.align as keyof typeof ALIGN_MAPPING] : '';
  const Comp = ELEMENTS[element.type]?.render;
  // Handle unknown element types gracefully (e.g., removed h3 type in old data)
  if (!Comp) {
    return <>{children}</>;
  }
  // Let Slate handle keying - no need for explicit key here
  return <Comp className={cls} {...props} />;
};

Element.displayName = 'SlateElement';

/**
 * Leaf renderer for text formatting marks
 * Uses shared getTextStyles utility for consistent styling
 */
const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  const style = getTextStyles(leaf);

  return (
    <span {...attributes} style={style}>
      {children}
    </span>
  );
};

Leaf.displayName = 'SlateLeaf';

export const PopperEditorContext = React.createContext<PopperEditorContextProps | undefined>(
  undefined,
);

export function usePopperEditorContext(): PopperEditorContextProps {
  const context = React.useContext(PopperEditorContext);
  if (!context) {
    throw new Error('usePopperEditorContext must be used within a PopperEditorContext.');
  }
  return context;
}

/**
 * Full-featured rich text editor with toolbar
 */
export const PopperEditor = (props: PopperEditorProps) => {
  const {
    zIndex = 0,
    initialValue = [],
    onValueChange,
    customUploadRequest,
    showToolbar: isShowToolBar = true,
    attributes,
    isInline = false,
  } = props;

  const {
    editor,
    setEditorRef,
    handleSlateChange,
    contextValue,
    handleMouseEnter,
    handleMouseLeave,
    renderElement,
    renderLeaf,
  } = useSlateEditor({
    withLinks: true,
    onValueChange,
    zIndex,
    customUploadRequest,
    attributes,
    ElementComponent: Element,
    LeafComponent: Leaf,
  });

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Code block has special Enter handling
      if (handleCodeBlockEnter(editor, event)) return;

      // Handle list Enter key
      if (handleListEnter(editor, event)) return;

      // Handle heading Enter key
      if (handleHeadingEnter(editor, event)) return;

      // Inline mode blocks Enter
      if (isInline && event.key === 'Enter') {
        event.preventDefault();
        return;
      }

      // Text formatting hotkeys
      handleFormattingHotkeys(editor, event);
    },
    [editor, isInline],
  );

  return (
    <div
      ref={setEditorRef}
      className="w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <PopperEditorContext.Provider value={contextValue}>
        <Slate editor={editor} initialValue={initialValue} onChange={handleSlateChange}>
          {isShowToolBar && <EditorToolbar />}
          <SlashCommandEditableWrapper
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder="Write, type '/' for commands…"
            spellCheck
            autoFocus={false}
            style={{ outline: 'none' }}
            onKeyDown={handleKeyDown}
          />
        </Slate>
      </PopperEditorContext.Provider>
    </div>
  );
};

PopperEditor.displayName = 'PopperEditor';

/**
 * Minimal inline editor for single-line input with user attributes
 */
export const PopperEditorMini = (props: PopperEditorProps) => {
  const {
    zIndex = 0,
    initialValue = [],
    onValueChange,
    customUploadRequest,
    attributes,
    className,
  } = props;

  const { editor, setEditorRef, handleSlateChange, contextValue, renderElement, renderLeaf } =
    useSlateEditor({
      withLinks: false, // Mini editor doesn't support links
      onValueChange,
      zIndex,
      customUploadRequest,
      attributes,
      ElementComponent: Element,
      LeafComponent: Leaf,
    });

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  }, []);

  return (
    <div
      ref={setEditorRef}
      className={cn(
        'rounded-md border border-input pl-2 relative flex flex-row items-center',
        'transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        className,
      )}
    >
      <PopperEditorContext.Provider value={contextValue}>
        <Slate editor={editor} initialValue={initialValue} onChange={handleSlateChange}>
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            className="grow"
            placeholder="Write text here…"
            spellCheck
            autoFocus={true}
            style={{ outline: 'none', minWidth: 0 }}
            onKeyDown={handleKeyDown}
          />
          <UserAttrButton className="flex-none" />
        </Slate>
      </PopperEditorContext.Provider>
    </div>
  );
};

PopperEditorMini.displayName = 'PopperEditorMini';
