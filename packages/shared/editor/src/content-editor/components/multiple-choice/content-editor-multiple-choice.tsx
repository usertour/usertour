// Main editable multiple choice component

import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { isEmptyString } from '@usertour/helpers';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import {
  EditorErrorTooltip,
  EditorErrorTooltipTrigger,
  EditorErrorTooltipContent,
} from '../../shared/editor-error-tooltip';
import { useContentEditorContext } from '../../../contexts/content-editor-context';
import type {
  ContentEditorMultipleChoiceElement,
  ContentEditorMultipleChoiceOption,
} from '../../../types/editor';
import { MultipleChoicePopoverContent } from './multiple-choice-popover-content';
import { SingleSelectionDisplay } from './single-selection-display';
import { MultipleSelectionDisplay } from './multiple-selection-display';

interface ContentEditorMultipleChoiceProps {
  element: ContentEditorMultipleChoiceElement;
  id: string;
  path: number[];
}

export const ContentEditorMultipleChoice = memo((props: ContentEditorMultipleChoiceProps) => {
  const { element, id } = props;
  const {
    updateElement,
    zIndex,
    currentStep,
    currentVersion,
    contentList,
    createStep,
    attributes,
    projectId,
  } = useContentEditorContext();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [localData, setLocalData] = useState(element.data);
  const [openError, setOpenError] = useState(false);

  const handleDataChange = useCallback(
    (data: Partial<ContentEditorMultipleChoiceElement['data']>) => {
      setLocalData((prevData) => ({ ...prevData, ...data }));
    },
    [],
  );

  useEffect(() => {
    setOpenError(isEmptyString(localData.name) && !isOpen);
  }, [localData.name, isOpen]);

  const handleOptionChange = useCallback(
    (index: number, field: keyof ContentEditorMultipleChoiceOption, value: string | boolean) => {
      setLocalData((prevData) => {
        const newOptions = [...prevData.options];
        newOptions[index] = { ...newOptions[index], [field]: value };
        return { ...prevData, options: newOptions };
      });
    },
    [],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        setOpenError(false);
        return;
      }
      if (isEmptyString(localData.name)) {
        setOpenError(true);
        return;
      }

      // Only update if data has changed
      if (JSON.stringify(localData) !== JSON.stringify(element.data)) {
        updateElement(
          {
            ...element,
            data: localData,
          },
          id,
        );
      }
    },
    [localData, element, id, updateElement],
  );

  // Memoize context props to prevent unnecessary re-renders
  const contextProps = useMemo(
    () => ({
      zIndex,
      currentStep,
      currentVersion,
      contentList,
      createStep,
      attributes,
      projectId,
    }),
    [zIndex, currentStep, currentVersion, contentList, createStep, attributes, projectId],
  );

  // Handler for checkbox checked change in preview
  const handleCheckboxChange = useCallback(
    (index: number, checked: boolean) => {
      handleOptionChange(index, 'checked', checked);
    },
    [handleOptionChange],
  );

  // Memoize checked values for multiple selection display
  const checkedValues = useMemo(
    () => localData.options.filter((o) => o.checked).map((o) => o.value),
    [localData.options],
  );

  return (
    <EditorErrorTooltip open={openError}>
      <Popover onOpenChange={handleOpenChange} open={isOpen}>
        <EditorErrorTooltipTrigger>
          <PopoverTrigger asChild>
            {localData.allowMultiple ? (
              <MultipleSelectionDisplay
                options={localData.options}
                enableOther={localData.enableOther}
                otherPlaceholder={localData.otherPlaceholder}
                buttonText={localData.buttonText}
                isInteractive={false}
                checkedValues={checkedValues}
                onCheckedChange={handleCheckboxChange}
              />
            ) : (
              <SingleSelectionDisplay
                options={localData.options}
                enableOther={localData.enableOther}
                otherPlaceholder={localData.otherPlaceholder}
                defaultValue={localData.options[0]?.value}
                isInteractive={false}
              />
            )}
          </PopoverTrigger>
        </EditorErrorTooltipTrigger>
        <PopoverContent
          className="w-96 bg-background shadow-lg"
          style={{ zIndex }}
          sideOffset={10}
          side="right"
        >
          <MultipleChoicePopoverContent
            localData={localData}
            onDataChange={handleDataChange}
            onOptionChange={handleOptionChange}
            contextProps={contextProps}
          />
        </PopoverContent>
      </Popover>
      <EditorErrorTooltipContent side="bottom" style={{ zIndex }}>
        Question name is required
      </EditorErrorTooltipContent>
    </EditorErrorTooltip>
  );
});

ContentEditorMultipleChoice.displayName = 'ContentEditorMultipleChoice';
