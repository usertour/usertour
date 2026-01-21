// Serialize component for content editor

import { isClickableElement, replaceUserAttr } from '@usertour/helpers';
import type { UserTourTypes } from '@usertour/types';
import { memo, useMemo } from 'react';

import type { ContentEditorClickableElement, ContentEditorRoot } from '../../types/editor';
import { ContentEditorColumnSerialize, ContentEditorGroupSerialize } from '../element-registry';
import { getElementSerializer } from '../element-registry';

export interface ContentEditorSerializeProps {
  contents: ContentEditorRoot[];
  userAttributes?: UserTourTypes.Attributes;
  onClick?: (element: ContentEditorClickableElement, value?: unknown) => Promise<void>;
}

export const ContentEditorSerialize = memo((props: ContentEditorSerializeProps) => {
  const { contents, onClick, userAttributes } = props;

  // Memoize the processed contents
  const editorContents = useMemo(
    () => (userAttributes ? replaceUserAttr(contents, userAttributes) : contents),
    [contents, userAttributes],
  );

  return (
    <>
      {editorContents.map((content, groupIndex) => (
        <ContentEditorGroupSerialize key={groupIndex}>
          {content.children.map((column, columnIndex) => (
            <ContentEditorColumnSerialize element={column.element} key={columnIndex}>
              {column.children.map((element, elementIndex) => {
                const Comp = getElementSerializer(element.element.type);
                if (!Comp) {
                  return null;
                }

                if (isClickableElement(element.element as ContentEditorClickableElement)) {
                  return (
                    <Comp
                      element={element.element as ContentEditorClickableElement}
                      onClick={onClick}
                      key={elementIndex}
                    />
                  );
                }
                return <Comp element={element.element} key={elementIndex} />;
              })}
            </ContentEditorColumnSerialize>
          ))}
        </ContentEditorGroupSerialize>
      ))}
    </>
  );
});

ContentEditorSerialize.displayName = 'ContentEditorSerialize';
