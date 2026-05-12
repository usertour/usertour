import { Descendant, Editor, Element as SlateElement, Range, Text, Transforms } from 'slate';
import {
  CustomEditor,
  CustomElementStrings,
  CustomMarkupStrings,
  LinkElementType,
} from '../types/slate';

/* Text Helpers */

/**
 * Check if a Slate node is a text node
 */
export const isText = (node: Descendant) => {
  return Text.isText(node);
};

/* Block Helpers */

export const isBlockActive = (editor: Editor, type: CustomElementStrings) => {
  if (!editor.selection) return false;
  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, editor.selection),
      match: (n: any) => Editor.isBlock(editor, n) && n.type === type,
    }),
  );
  return !!match;
};

export const toggleCurrentBlock = (editor: Editor, type: CustomElementStrings) => {
  Transforms.setNodes(
    editor,
    { type: isBlockActive(editor, type) ? undefined : type },
    { match: (n: any) => Editor.isBlock(editor, n) },
  );
};

/* Markup Helpers */

export const isMarkActive = (editor: Editor, type: CustomMarkupStrings) => {
  const marks = Editor.marks(editor);
  return marks ? marks[type] === true : false;
};

export const toggleMark = (editor: Editor, type: CustomMarkupStrings) => {
  Transforms.setNodes(
    editor,
    { [type]: !isMarkActive(editor, type) },
    { match: (n) => Text.isText(n), split: true },
  );
};

/**
 * Insert a user attribute block at the current selection
 */
export const insertUserAttributeBlock = (editor: CustomEditor) => {
  Transforms.insertNodes(editor, {
    type: 'user-attribute',
    fallback: '',
    attrCode: '',
    children: [{ text: '' }],
  });
};

export const isLinkActive = (editor: CustomEditor) => {
  const [link] = Editor.nodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link',
  });
  return !!link;
};

export const unwrapLink = (editor: CustomEditor) => {
  Transforms.unwrapNodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link',
  });
};

export const wrapLink = (editor: CustomEditor, url: string) => {
  if (isLinkActive(editor)) {
    unwrapLink(editor);
  }

  const { selection } = editor;
  const isCollapsed = selection && Range.isCollapsed(selection);
  const link: LinkElementType = {
    type: 'link',
    url,
    children: isCollapsed ? [{ text: url }] : [],
  };

  if (isCollapsed) {
    Transforms.insertNodes(editor, link);
  } else {
    Transforms.wrapNodes(editor, link, { split: true });
    Transforms.collapse(editor, { edge: 'end' });
  }
};

export const insertLink = (editor: CustomEditor, url: string) => {
  if (editor.selection) {
    wrapLink(editor, url);
  }
};
