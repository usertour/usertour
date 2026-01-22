// Main editable multiple choice component

import { memo, useCallback, useState } from 'react';

import type { ContentEditorMultipleChoiceElement } from '../../../types/editor';
import { QuestionEditorBase } from '../../shared/question-editor-base';
import type { QuestionContextProps } from '../../shared';
import { MultipleChoicePopoverContent } from './multiple-choice-popover-content';
import { SingleSelectionDisplay } from './single-selection-display';
import { MultipleSelectionDisplay } from './multiple-selection-display';

export interface ContentEditorMultipleChoiceProps {
  element: ContentEditorMultipleChoiceElement;
  id: string;
  path: number[];
}

export const ContentEditorMultipleChoice = memo((props: ContentEditorMultipleChoiceProps) => {
  const { element, id } = props;

  // Local state for checkbox handling in preview
  const [localCheckedState, setLocalCheckedState] = useState<Record<string, boolean>>({});

  // Render the display component (trigger for popover)
  const renderDisplay = useCallback(
    (localData: ContentEditorMultipleChoiceElement['data']) => {
      // Handler for checkbox checked change in preview
      const handleCheckboxChange = (index: number, checked: boolean) => {
        const option = localData.options[index];
        if (option) {
          setLocalCheckedState((prev) => ({
            ...prev,
            [option.value]: checked,
          }));
        }
      };

      // Memoize checked values for multiple selection display
      const checkedValues = localData.options
        .filter((o) => localCheckedState[o.value] ?? o.checked)
        .map((o) => o.value);

      if (localData.allowMultiple) {
        return (
          <MultipleSelectionDisplay
            options={localData.options}
            enableOther={localData.enableOther}
            otherPlaceholder={localData.otherPlaceholder}
            buttonText={localData.buttonText}
            isInteractive={false}
            checkedValues={checkedValues}
            onCheckedChange={handleCheckboxChange}
          />
        );
      }

      return (
        <SingleSelectionDisplay
          options={localData.options}
          enableOther={localData.enableOther}
          otherPlaceholder={localData.otherPlaceholder}
          defaultValue={localData.options[0]?.value}
          isInteractive={false}
        />
      );
    },
    [localCheckedState],
  );

  // Render the popover content
  const renderPopoverContent = useCallback(
    (contentProps: {
      localData: ContentEditorMultipleChoiceElement['data'];
      handleDataChange: (data: Partial<ContentEditorMultipleChoiceElement['data']>) => void;
      contextProps: QuestionContextProps;
    }) => <MultipleChoicePopoverContent {...contentProps} />,
    [],
  );

  return (
    <QuestionEditorBase
      element={element}
      id={id}
      renderDisplay={renderDisplay}
      renderPopoverContent={renderPopoverContent}
      popoverClassName="w-96 bg-background shadow-lg"
    />
  );
});

ContentEditorMultipleChoice.displayName = 'ContentEditorMultipleChoice';
