// Multiple choice serialize component for SDK rendering

import type {
  ContentEditorMultipleChoiceElement,
  ContentEditorMultipleChoiceOption,
} from '@usertour/types';
import { memo, useCallback, useMemo } from 'react';

import { MultipleSelection, SingleSelection } from '../../question';

// Single selection serialize
interface SingleSelectionSerializeProps {
  element: ContentEditorMultipleChoiceElement;
  options: ContentEditorMultipleChoiceOption[];
  onClick?: (element: ContentEditorMultipleChoiceElement, value?: unknown) => Promise<void> | void;
}

const SingleSelectionSerialize = memo(
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
      <SingleSelection
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

// Multiple selection serialize
interface MultipleSelectionSerializeProps {
  element: ContentEditorMultipleChoiceElement;
  options: ContentEditorMultipleChoiceOption[];
  onClick?: (element: ContentEditorMultipleChoiceElement, value?: unknown) => Promise<void> | void;
}

const MultipleSelectionSerialize = memo(
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

// Main multiple choice serialize component
export interface MultipleChoiceSerializeProps {
  element: ContentEditorMultipleChoiceElement;
  onClick?: (element: ContentEditorMultipleChoiceElement, value?: unknown) => Promise<void> | void;
}

export const MultipleChoiceSerialize = memo((props: MultipleChoiceSerializeProps) => {
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
});

MultipleChoiceSerialize.displayName = 'MultipleChoiceSerialize';
