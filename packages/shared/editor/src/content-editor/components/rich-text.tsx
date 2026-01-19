import { Descendant } from 'slate';
import { PopperEditor } from '../../richtext-editor/editor';
import { serialize } from '../../richtext-editor/serialize';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import { ContentEditorTextElement } from '../../types/editor';

export interface ContentEditorRichTextProps {
  element: ContentEditorTextElement;
  path: number[];
  id: string;
}

export const ContentEditorRichText = (props: ContentEditorRichTextProps) => {
  const { element, path, id } = props;
  const { updateElement, activeId, zIndex, attributes } = useContentEditorContext();

  const handleUpdate = (value: Descendant[]) => {
    updateElement({ ...element, data: value }, id);
  };

  return (
    <PopperEditor
      showToolbar={!activeId}
      attributes={attributes}
      initialValue={element.data}
      onValueChange={handleUpdate}
      key={path.join('-')}
      zIndex={zIndex}
    />
  );
};

ContentEditorRichText.displayName = 'ContentEditorRichText';

export type ContentEditorRichTextSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorTextElement;
};

export const ContentEditorRichTextSerialize = (props: ContentEditorRichTextSerializeType) => {
  const { element } = props;

  return (
    <div className="w-full">
      {element.data.map((node, index) => serialize(node, undefined, index))}
    </div>
  );
};

ContentEditorRichTextSerialize.displayName = 'ContentEditorRichTextSerialize';
