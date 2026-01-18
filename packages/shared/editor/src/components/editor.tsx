'use client';

import { uuidV4 } from '@usertour/helpers';
import { cn } from '@usertour-packages/tailwind';
import isHotkey from 'is-hotkey';
import React, { CSSProperties, useCallback, useMemo, useState } from 'react';
import {
  Descendant,
  Editor,
  Element as SlateElement,
  Path,
  Text,
  Transforms,
  createEditor,
} from 'slate';
import { withHistory } from 'slate-history';
import { Editable, RenderElementProps, RenderLeafProps, Slate, withReact } from 'slate-react';
import { toggleTextProps } from '../lib/text';
import { withLink } from '../lib/withLink';
import { withUserAttribute } from '../lib/withUserAttribute';
import { PopperEditorContextProps, PopperEditorProps } from '../types/editor';
import { ELEMENTS } from './elements';
import { EditorToolbar } from './toolbar';
import { UserAttrButton } from './toolbar/user-attr';

const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
};

export const ALIGN_MAPPING = {
  right: 'text-right',
  left: 'text-left',
  center: 'text-center',
  justify: 'text-justify',
};

const serialize = (node: Descendant, index: string): JSX.Element | null => {
  if (Text.isText(node)) {
    return serializeLeaf(node) ?? null;
  }
  const children = <>{node.children.map((n: any, i: number) => serialize(n, `${index}-${i}`))}</>;
  const cls = 'align' in node ? ALIGN_MAPPING[node.align as keyof typeof ALIGN_MAPPING] : '';
  const Comp = ELEMENTS[node.type]?.serialize;
  if (Comp) {
    return (
      <Comp className={cls} element={node} key={index}>
        {children}
      </Comp>
    );
  }
  return children;
};

export const isText = (node: Descendant) => {
  return Text.isText(node);
};

export const serializeLeaf = (node: Descendant, key = '') => {
  if (!Text.isText(node)) {
    return null;
  }
  const string = node.text;

  // Skip empty text nodes to avoid rendering unnecessary &nbsp;
  // These are typically created by Slate around inline elements
  if (!string) {
    return null;
  }

  const style: CSSProperties = {};
  if (node.bold) {
    style.fontWeight = 'bold';
  }
  if (node.italic) {
    style.fontStyle = 'italic';
  }
  if (node.underline) {
    style.textDecoration = 'underline';
  }
  if (node.color) {
    style.color = node.color;
  }
  return (
    <span style={{ ...style }} key={key}>
      {string}
    </span>
  );
};

const Element = (props: RenderElementProps) => {
  const { element, children } = props;
  const cls = 'align' in element ? ALIGN_MAPPING[element.align as keyof typeof ALIGN_MAPPING] : '';
  const Comp = ELEMENTS[element.type]?.render;
  // Handle unknown element types gracefully (e.g., removed h3 type in old data)
  if (!Comp) {
    return <>{children}</>;
  }
  return <Comp className={cls} key={uuidV4()} {...props} />;
};

const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  const style: any = {};
  if (leaf.bold) {
    style.fontWeight = 'bold';
  }

  if (leaf.italic) {
    style.fontStyle = 'italic';
  }

  if (leaf.underline) {
    style.textDecoration = 'underline';
  }

  if (leaf.color) {
    style.color = leaf.color;
  }

  return (
    <span {...attributes} style={{ ...style }}>
      {children}
    </span>
  );
};

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
  const renderElement = useCallback((props: RenderElementProps) => <Element {...props} />, []);
  const renderLeaf = useCallback((props: RenderLeafProps) => <Leaf {...props} />, []);
  const editor = useMemo(
    () => withHistory(withLink(withUserAttribute(withReact(createEditor())))),
    [],
  );
  const [showToolbar, setShowToolbar] = useState(false);
  const [isEditorHover, setIsEditorHover] = useState(false);
  const [editorRef, setEditorRef] = useState<HTMLDivElement | null>(null);
  const handleOnFocus = () => {
    setShowToolbar(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Handle Enter in code block
    if (event.key === 'Enter') {
      const [codeBlock] = Editor.nodes(editor, {
        match: (n) => SlateElement.isElement(n) && n.type === 'code',
      });

      if (codeBlock) {
        // Cmd/Ctrl+Enter: exit code block and create new paragraph
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          const [, codePath] = codeBlock;
          // Insert new paragraph after code block
          Transforms.insertNodes(
            editor,
            { type: 'paragraph', children: [{ text: '' }] },
            { at: Path.next(codePath) },
          );
          // Move cursor to new paragraph
          Transforms.select(editor, Path.next(codePath));
          return;
        }

        // Regular Enter: insert newline within code block
        event.preventDefault();
        editor.insertText('\n');
        return;
      }
    }

    if (isInline && event.key === 'Enter') {
      event.preventDefault();
    }
    for (const hotkey in HOTKEYS) {
      if (isHotkey(hotkey, event as any)) {
        event.preventDefault();
        const mark = HOTKEYS[hotkey as keyof typeof HOTKEYS];
        toggleTextProps(editor, mark);
      }
    }
  };

  const handleOnChange = (value: Descendant[]) => {
    const s: React.ReactNode[] = [];
    value.forEach((v, index) => {
      s.push(serialize(v, index.toString()));
    });
    if (onValueChange) {
      onValueChange(value);
    }
  };

  const value = {
    zIndex,
    container: editorRef,
    showToolbar,
    isEditorHover,
    customUploadRequest,
    setIsEditorHover,
    setShowToolbar,
    attributes,
  };

  return (
    <div
      ref={setEditorRef}
      // style={{ minWidth: "100px" }}
      className="w-full"
      onMouseOver={() => {
        setIsEditorHover(true);
      }}
      onMouseOut={() => setIsEditorHover(false)}
      onFocus={() => {
        setIsEditorHover(true);
      }}
      onBlur={() => setIsEditorHover(false)}
      // onClick={}
    >
      <PopperEditorContext.Provider value={value}>
        <Slate
          editor={editor}
          initialValue={initialValue}
          onChange={(value) => {
            const isAstChange = editor.operations.some((op) => 'set_selection' !== op.type);
            if (isAstChange) {
              handleOnChange(value);
              // const content = JSON.stringify(value);
              // localStorage.setItem("content_json", content);
            }
          }}
        >
          {isShowToolBar && <EditorToolbar />}
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder="Write text here…"
            spellCheck
            autoFocus={false}
            style={{ outline: 'none' }}
            onFocus={handleOnFocus}
            onKeyDown={handleKeyDown}
          />
        </Slate>
      </PopperEditorContext.Provider>
    </div>
  );
};

PopperEditor.displayName = 'PopperEditor';

export const serializeMini = (node: Descendant): string => {
  if (Text.isText(node)) {
    return node.text;
  }
  if (node.type && node.type === 'user-attribute') {
    return `{${node.attrCode || node.fallback}}`;
  }

  if (node.children) {
    return node.children.map((n: Descendant) => serializeMini(n)).join();
  }
  return '';
};

export const PopperEditorMini = (props: PopperEditorProps) => {
  const {
    zIndex,
    initialValue = [],
    onValueChange,
    customUploadRequest,
    attributes,
    className,
  } = props;
  const renderElement = useCallback((props: RenderElementProps) => <Element {...props} />, []);
  const renderLeaf = useCallback((props: RenderLeafProps) => <Leaf {...props} />, []);
  const editor = useMemo(() => withHistory(withUserAttribute(withReact(createEditor()))), []);
  const [showToolbar, setShowToolbar] = useState(false);
  const [isEditorHover, setIsEditorHover] = useState(false);
  const [editorRef, setEditorRef] = useState<HTMLDivElement | null>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  };

  const handleOnChange = (value: Descendant[]) => {
    const s: React.ReactNode[] = [];
    value.forEach((v, index) => {
      s.push(serialize(v, index.toString()));
    });
    if (onValueChange) {
      onValueChange(value);
    }
  };

  const value = {
    zIndex,
    container: editorRef,
    showToolbar,
    isEditorHover,
    customUploadRequest,
    setIsEditorHover,
    setShowToolbar,
    attributes,
  };

  return (
    <div
      ref={setEditorRef}
      className={cn(
        'rounded-md border border-input p-2 relative flex flex-row items-center',
        className,
      )}
    >
      <PopperEditorContext.Provider value={value}>
        <Slate
          editor={editor}
          initialValue={initialValue}
          onChange={(value) => {
            const isAstChange = editor.operations.some((op) => 'set_selection' !== op.type);
            if (isAstChange) {
              handleOnChange(value);
              // const content = JSON.stringify(value);
              // localStorage.setItem("content_json", content);
            }
          }}
        >
          {/* {isShowToolBar && <EditorToolbar />} */}
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
