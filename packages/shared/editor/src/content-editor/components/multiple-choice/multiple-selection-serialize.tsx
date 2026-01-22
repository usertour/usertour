// Multiple selection (checkbox) serialize component

import { MultipleSelection } from '@usertour-packages/widget';
import { memo, useCallback } from 'react';

import type {
  ContentEditorMultipleChoiceElement,
  ContentEditorMultipleChoiceOption,
} from '../../../types/editor';

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
      <MultipleSelection
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
