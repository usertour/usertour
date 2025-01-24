import { useCallback, useEffect, useState } from "react";
import { PopperEditor } from "../../components/editor";
import { ContentEditorTextElement } from "../../types/editor";
import { Descendant } from "slate";
import { useContentEditorContext } from "../../contexts/content-editor-context";
import { isEqual } from "@usertour-ui/shared-utils";
import { serialize } from "../../components/serialize";

const data = {
  type: "paragraph",
  children: [{ text: "this is a text" }],
};
export interface ContentEditorRichTextProps {
  element: ContentEditorTextElement;
  path: number[];
  id: string;
}

export const ContentEditorRichText = (props: ContentEditorRichTextProps) => {
  const { element, path, id } = props;
  const { updateElement, activeId, zIndex, attributes } =
    useContentEditorContext();

  const handleUpdate = (value: Descendant[]) => {
    updateElement({ ...element, data: value }, id);
  };

  return (
    <PopperEditor
      showToolbar={activeId ? false : true}
      attributes={attributes}
      initialValue={element.data}
      onValueChange={handleUpdate}
      key={path.join("-")}
      zIndex={zIndex}
    ></PopperEditor>
  );
};

ContentEditorRichText.displayName = "ContentEditorRichText";

export type ContentEditorRichTextSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorTextElement;
};

export const ContentEditorRichTextSerialize = (
  props: ContentEditorRichTextSerializeType
) => {
  const { element } = props;

  return (
    <>
      <div className="w-full">
        {element.data.map((node) => serialize(node))}
      </div>
    </>
  );
};

ContentEditorRichTextSerialize.displayName = "ContentEditorRichTextSerialize";
