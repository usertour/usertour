// Base wrapper component for question editors (NPS, Scale, Star Rating)

import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { isEmptyString } from '@usertour/helpers';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  EditorErrorTooltip,
  EditorErrorTooltipTrigger,
  EditorErrorTooltipContent,
} from './editor-error-tooltip';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import type { ContentEditorElement } from '../../types/editor';
import type { QuestionContextProps } from './question-popover-fields';

// Types
export interface QuestionElementBase {
  type: string;
  data: {
    name: string;
    [key: string]: any;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export interface QuestionEditorBaseProps<T extends QuestionElementBase> {
  element: T;
  id: string;
  // Custom validation function - if not provided, only validates name
  validate?: (data: T['data']) => ValidationResult;
  // Render the display component (trigger for popover)
  // Note: renderDisplay should return a single element (not a fragment) for PopoverTrigger
  renderDisplay: (localData: T['data']) => ReactNode;
  // Render the popover content
  renderPopoverContent: (props: {
    localData: T['data'];
    handleDataChange: (data: Partial<T['data']>) => void;
    contextProps: QuestionContextProps;
  }) => ReactNode;
  // Optional popover class name
  popoverClassName?: string;
}

// Default validation - just check if name is empty
const defaultValidate = <T extends QuestionElementBase>(data: T['data']): ValidationResult => ({
  isValid: !isEmptyString(data.name),
  errorMessage: isEmptyString(data.name) ? 'Question name is required' : undefined,
});

function QuestionEditorBaseInner<T extends QuestionElementBase>(props: QuestionEditorBaseProps<T>) {
  const {
    element,
    id,
    validate = defaultValidate,
    renderDisplay,
    renderPopoverContent,
    popoverClassName = 'bg-background shadow-lg',
  } = props;

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
  const [openError, setOpenError] = useState<boolean>(false);
  const [localData, setLocalData] = useState<T['data']>(element.data);

  // Memoize context props to prevent unnecessary re-renders
  const contextProps = useMemo<QuestionContextProps>(
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

  // Handle data change
  const handleDataChange = useCallback((data: Partial<T['data']>) => {
    setLocalData((prevData) => ({ ...prevData, ...data }));
  }, []);

  // Validation result
  const validationResult = useMemo(() => validate(localData), [validate, localData]);

  // Update error state when validation changes
  useEffect(() => {
    setOpenError(!validationResult.isValid && !isOpen);
  }, [validationResult.isValid, isOpen]);

  // Handle popover open/close
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);

      if (open) {
        setOpenError(false);
        return;
      }

      // Validate when closing
      if (!validationResult.isValid) {
        setOpenError(true);
        return;
      }

      // Only update if data has changed
      if (JSON.stringify(localData) !== JSON.stringify(element.data)) {
        // Type assertion needed because updateElement expects ContentEditorElement
        // but we're working with a generic type that extends QuestionElementBase
        updateElement(
          {
            ...element,
            data: localData,
          } as unknown as ContentEditorElement,
          id,
        );
      }
    },
    [validationResult.isValid, localData, element, id, updateElement],
  );

  return (
    <EditorErrorTooltip open={openError}>
      <Popover onOpenChange={handleOpenChange} open={isOpen}>
        <EditorErrorTooltipTrigger>
          <PopoverTrigger asChild>{renderDisplay(localData)}</PopoverTrigger>
        </EditorErrorTooltipTrigger>
        <PopoverContent
          className={popoverClassName}
          style={{ zIndex }}
          sideOffset={10}
          side="right"
        >
          {renderPopoverContent({
            localData,
            handleDataChange,
            contextProps,
          })}
        </PopoverContent>
      </Popover>
      <EditorErrorTooltipContent side="bottom" style={{ zIndex }}>
        {validationResult.errorMessage || 'Please fix the errors above'}
      </EditorErrorTooltipContent>
    </EditorErrorTooltip>
  );
}

// Memoized version with generic support
export const QuestionEditorBase = memo(QuestionEditorBaseInner) as typeof QuestionEditorBaseInner;
