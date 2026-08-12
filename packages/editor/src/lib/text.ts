import { Editor, Element as SlateElement, Transforms } from 'slate';

// Marks a `user-attribute` chip can carry — as ELEMENT flags, because a void
// inline has no text leaves for Slate's leaf marks to live on.
const CHIP_MARKS = new Set(['bold', 'italic', 'underline']);

const selectedChips = (editor: Editor) =>
  editor.selection
    ? Array.from(
        Editor.nodes(editor, {
          at: editor.selection,
          match: (n) =>
            SlateElement.isElement(n) && (n as { type?: string }).type === 'user-attribute',
          voids: true,
        }),
      )
    : [];

export const getTextProps = (editor: Editor, format: string, defaultValue: any = false) => {
  const marks = Editor.marks(editor);
  const leaf = marks ? marks[format as keyof typeof marks] : defaultValue;
  if (!CHIP_MARKS.has(format)) {
    return leaf;
  }
  const sel = editor.selection;
  if (leaf || !sel || Editor.string(editor, sel).length > 0) {
    return leaf;
  }
  // Text-less selection (e.g. only a chip is selected): the chip's element
  // flags ARE the state — otherwise the toolbar reads "inactive" on a bold
  // chip and a press would surprise-unset it.
  const chips = selectedChips(editor);
  return chips.length > 0 && chips.every(([n]) => Boolean((n as Record<string, unknown>)[format]));
};

export const setTextProps = (editor: Editor, format: string, value: any) => {
  Editor.addMark(editor, format, value);
};

export const removeTextProps = (editor: Editor, format: string) => {
  Editor.removeMark(editor, format);
};

export const toggleTextProps = (editor: Editor, format: string) => {
  const active = Boolean(getTextProps(editor, format));
  if (active) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
  if (!CHIP_MARKS.has(format)) {
    return;
  }
  // Chips in the selection follow the SAME target state as the text, so one
  // press unifies a mixed selection instead of leaving the name behind.
  for (const [, path] of selectedChips(editor)) {
    if (active) {
      Transforms.unsetNodes(editor, format, { at: path, voids: true });
    } else {
      Transforms.setNodes(editor, { [format]: true } as Partial<SlateElement>, {
        at: path,
        voids: true,
      });
    }
  }
};
