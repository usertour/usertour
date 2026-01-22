// Multiple selection (checkbox) serialize component

import { memo, useCallback } from 'react';

import type {
  ContentEditorMultipleChoiceElement,
  ContentEditorMultipleChoiceOption,
} from '../../../types/editor';
import { MultipleSelectionDisplay } from './multiple-selection-display';

interface MultipleSelectionSerializeProps {
  element: ContentEditorMultipleChoiceElement;
  options: ContentEditorMultipleChoiceOption[];
  onClick?: (element: ContentEditorMultipleChoiceElement, value?: any) => Promise<void> | void;
}

export const MultipleSelectionSerialize = memo(
  ({ element, options, onClick }: MultipleSelectionSerializeProps) => {
    const handleValueChange = useCallback(
      async (values: string[]) => {
        await onClick?.(element, values);
      },
      [element, onClick],
    );

    return (
      <MultipleSelectionDisplay
        options={options}
        enableOther={element.data.enableOther}
        otherPlaceholder={element.data.otherPlaceholder}
        buttonText={element.data.buttonText}
        lowRange={element.data.lowRange}
        highRange={element.data.highRange}
        isInteractive={true}
        onValueChange={handleValueChange}
      />
    );
  },
);

MultipleSelectionSerialize.displayName = 'MultipleSelectionSerialize';
