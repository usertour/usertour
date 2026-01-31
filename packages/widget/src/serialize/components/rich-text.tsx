// Rich text serialize component for SDK rendering

import type { ContentEditorTextElement } from '@usertour/types';
import { memo } from 'react';

import type { DescendantNode } from '../types';
import { serialize } from '../utils';

export interface RichTextSerializeProps {
  element: ContentEditorTextElement;
}

export const RichTextSerialize = memo<RichTextSerializeProps>((props) => {
  const { element } = props;

  return (
    <div className="w-full">
      {(element.data as DescendantNode[]).map((node, index) => serialize(node, undefined, index))}
    </div>
  );
});

RichTextSerialize.displayName = 'RichTextSerialize';
