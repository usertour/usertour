// Main serialize entry component for multiple choice

import { memo, useMemo } from 'react';

import type { ContentEditorMultipleChoiceElement } from '../../../types/editor';
import { MultipleSelectionSerialize } from './multiple-selection-serialize';
import { SingleSelectionSerialize } from './single-selection-serialize';

interface ContentEditorMultipleChoiceSerializeProps {
  element: ContentEditorMultipleChoiceElement;
  onClick?: (element: ContentEditorMultipleChoiceElement, value?: any) => Promise<void> | void;
}

export const ContentEditorMultipleChoiceSerialize = memo(
  (props: ContentEditorMultipleChoiceSerializeProps) => {
    const { element, onClick } = props;

    // Shuffle options if enabled
    const options = useMemo(() => {
      if (element.data.shuffleOptions) {
        return [...element.data.options].sort(() => Math.random() - 0.5);
      }
      return element.data.options;
    }, [element.data.options, element.data.shuffleOptions]);

    if (element.data.allowMultiple) {
      return <MultipleSelectionSerialize element={element} options={options} onClick={onClick} />;
    }

    return <SingleSelectionSerialize element={element} options={options} onClick={onClick} />;
  },
);

ContentEditorMultipleChoiceSerialize.displayName = 'ContentEditorMultipleChoiceSerialize';
