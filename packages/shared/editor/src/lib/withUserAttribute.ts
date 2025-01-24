import { Editor } from "slate";

export const withUserAttribute = (editor: Editor) => {
  const { isVoid, isInline } = editor;

  editor.isVoid = (element) => {
    return element.type === "user-attribute" ? true : isVoid(element);
  };

  editor.isInline = (element) => {
    return element.type === "user-attribute" ? true : isInline(element);
  };

  return editor;
};
