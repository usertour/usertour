import { Editor, Element as SlateElement, Path, Transforms } from 'slate';

/**
 * Editor plugin to reset align property when inserting breaks in paragraphs
 * Ensures new paragraphs don't inherit align from previous paragraph
 * Note: h1/h2 are handled separately in handleHeadingEnter
 */
export const withAlignReset = (editor: Editor) => {
  const { insertBreak } = editor;

  editor.insertBreak = () => {
    const { selection } = editor;
    if (!selection) {
      insertBreak();
      return;
    }

    // Check if we're in a paragraph
    const [paragraph] = Editor.nodes(editor, {
      match: (n) => SlateElement.isElement(n) && n.type === 'paragraph',
    });

    if (paragraph) {
      const [node, path] = paragraph;
      // If paragraph has align property, we need to handle it specially
      if ('align' in node && node.align) {
        // Use splitNodes to split the paragraph, which gives us more control
        Transforms.splitNodes(editor, {
          always: true,
        });

        // After split, the cursor should be in the new paragraph
        // Get the current selection to find the new paragraph path
        const { selection: newSelection } = editor;
        if (newSelection) {
          const [newParagraph] = Editor.nodes(editor, {
            at: Editor.unhangRange(editor, newSelection),
            match: (n) => SlateElement.isElement(n) && n.type === 'paragraph',
          });

          if (newParagraph) {
            const [newNode, newPath] = newParagraph;
            // Only reset if this is a different paragraph (not the original one)
            if (!Path.equals(path, newPath) && SlateElement.isElement(newNode)) {
              // Remove align property from the new paragraph
              Transforms.setNodes(editor, { align: undefined }, { at: newPath });
            }
          }
        }
        return;
      }
    }

    // Default behavior for other cases
    insertBreak();
  };

  return editor;
};
