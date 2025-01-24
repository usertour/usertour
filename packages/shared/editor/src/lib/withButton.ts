import { Editor } from "slate";

export const withButton = (editor: Editor) => {
  const { isVoid } = editor;

  editor.isVoid = (element) => {
    return element.type === "button" ? true : isVoid(element);
  };

  return editor;
};
