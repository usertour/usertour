import { isUrl } from '@usertour/helpers';
import { Editor, Element as SlateElement, Node, Transforms } from 'slate';
import { wrapLink } from './editorHelper';

export const withLink = (editor: Editor) => {
  const { insertData, insertText, isInline, normalizeNode } = editor;

  editor.isInline = (element) => {
    return element.type === 'link' ? true : isInline(element);
  };

  // Normalize to remove empty link elements
  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    if (SlateElement.isElement(node) && node.type === 'link') {
      // Check if link only contains empty text nodes
      const isEmpty = node.children.every(
        (child: Node) => 'text' in child && (child as { text: string }).text === '',
      );

      if (isEmpty) {
        Transforms.unwrapNodes(editor, { at: path });
        return;
      }
    }

    normalizeNode(entry);
  };

  editor.insertText = (text) => {
    if (text && isUrl(text)) {
      wrapLink(editor, text);
    } else {
      insertText(text);
    }
  };

  editor.insertData = (data) => {
    const text = data.getData('text/plain');

    if (text && isUrl(text)) {
      wrapLink(editor, text);
    } else {
      insertData(data);
    }
  };

  return editor;
};
