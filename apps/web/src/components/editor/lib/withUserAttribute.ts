import { Editor } from 'slate';

export const withUserAttribute = (editor: Editor) => {
  const { isVoid, isInline } = editor;

  editor.isVoid = (element) => {
    return element.type === 'user-attribute' || element.type === 'slash-input'
      ? true
      : isVoid(element);
  };

  editor.isInline = (element) => {
    return element.type === 'user-attribute' || element.type === 'slash-input'
      ? true
      : isInline(element);
  };

  return editor;
};
