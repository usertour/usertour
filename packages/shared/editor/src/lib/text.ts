import { Editor } from 'slate';

export const getTextProps = (editor: Editor, format: string, defaultValue: any = false) => {
  const marks = Editor.marks(editor);
  if (marks) {
    return marks[format as keyof typeof marks];
  }
  return defaultValue;
};

export const setTextProps = (editor: Editor, format: string, value: any) => {
  Editor.addMark(editor, format, value);
};

export const toggleTextProps = (editor: Editor, format: string) => {
  const active = getTextProps(editor, format);
  if (active) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};
