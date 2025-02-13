import {
  Descendant,
  Editor,
  Element as SlateElement,
  Node,
  Path,
  Range,
  Text,
  Transforms,
} from 'slate';
import { NodeInsertNodesOptions } from 'slate/dist/interfaces/transforms/node';
import {
  ColumnElementType,
  CustomEditor,
  CustomElementStrings,
  CustomMarkupStrings,
  LinkElementType,
} from '../types/slate';

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

export const inertImageBlock = (editor: CustomEditor) => {
  Transforms.insertNodes(editor, {
    type: 'image',
    url: '',
    width: { type: 'percent', value: 100 },
    children: [{ text: '' }],
  });
};

export const inertEmbedBlock = (editor: CustomEditor) => {
  Transforms.insertNodes(editor, {
    type: 'embed',
    url: '',
    width: { type: 'percent', value: 100 },
    children: [{ text: '' }],
  });
};

export const inertColumnBlock = (
  editor: CustomEditor,
  columnProps: Partial<ColumnElementType>,
  children: Descendant[],
  options?: NodeInsertNodesOptions<Node>,
) => {
  Transforms.insertNodes(
    editor,
    {
      ...columnProps,
      type: 'column',
      children,
    },
    options,
  );
};

export const inertGroupBlockV2 = (
  editor: CustomEditor,
  children: Descendant[],
  options?: NodeInsertNodesOptions<Node>,
) => {
  Transforms.insertNodes(
    editor,
    {
      type: 'group',
      isFirst: false,
      isLast: false,
      children: [
        {
          type: 'column',
          width: { type: 'fill', value: 50 },
          style: { justifyContent: 'start', marginRight: '30' },
          children,
        },
      ],
    },
    options,
  );
};

export const inertGroupBlock = (editor: CustomEditor, options?: NodeInsertNodesOptions<Node>) => {
  Transforms.insertNodes(
    editor,
    {
      type: 'group',
      isFirst: false,
      isLast: false,
      children: [
        {
          type: 'column',
          width: { type: 'fill', value: 50 },
          style: { justifyContent: 'start', marginRight: '30' },
          children: [
            {
              type: 'paragraph',
              children: [{ text: 'this is a text' }],
            },
          ],
        },
      ],
    },
    options,
  );
};

export const inertButtonBlock = (editor: CustomEditor) => {
  Transforms.insertNodes(editor, {
    type: 'button',
    data: { text: 'Button', type: 'default', action: 'goto' },
    children: [{ text: '' }],
  });
};

export const inertUserAttributeBlock = (editor: CustomEditor) => {
  Transforms.insertNodes(editor, {
    type: 'user-attribute',
    fallback: '',
    attrCode: '',
    children: [{ text: '' }],
  });
};

export const updateNodeStatus = (editor: CustomEditor) => {
  let lastPath: Path | undefined = undefined;
  for (const [, path] of Node.children(editor, [])) {
    Transforms.setNodes(editor, { isFirst: path[0] === 0, isLast: false }, { at: path });
    lastPath = path;
  }
  if (lastPath) {
    Transforms.setNodes(editor, { isFirst: lastPath[0] === 0, isLast: true }, { at: lastPath });
  }
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
