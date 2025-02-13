import { Editor } from 'slate';

export const withEmbed = (editor: Editor) => {
  const { isVoid } = editor;

  editor.isVoid = (element) => {
    return element.type === 'embed' ? true : isVoid(element);
  };

  return editor;
};
