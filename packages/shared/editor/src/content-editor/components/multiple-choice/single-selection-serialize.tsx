// Single selection (radio) serialize component

import { memo, useCallback } from 'react';

import type {
  ContentEditorMultipleChoiceElement,
  ContentEditorMultipleChoiceOption,
} from '../../../types/editor';
import { SingleSelectionDisplay } from './single-selection-display';

interface SingleSelectionSerializeProps {
  element: ContentEditorMultipleChoiceElement;
  options: ContentEditorMultipleChoiceOption[];
  onClick?: (element: ContentEditorMultipleChoiceElement, value?: any) => Promise<void> | void;
}

export const SingleSelectionSerialize = memo(
  ({ element, options, onClick }: SingleSelectionSerializeProps) => {
    const handleValueChange = useCallback(
      (value: string) => {
        onClick?.(element, value);
      },
      [element, onClick],
    );

    const handleOtherSubmit = useCallback(
      (value: string) => {
        onClick?.(element, value);
      },
      [element, onClick],
    );

    return (
      <SingleSelectionDisplay
        options={options}
        enableOther={element.data.enableOther}
        otherPlaceholder={element.data.otherPlaceholder}
        isInteractive={true}
        onValueChange={handleValueChange}
        onOtherSubmit={handleOtherSubmit}
      />
    );
  },
);

SingleSelectionSerialize.displayName = 'SingleSelectionSerialize';
