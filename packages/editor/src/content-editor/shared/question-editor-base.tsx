// Base wrapper component for question editors (NPS, Scale, Star Rating)

import { Popover, PopoverContent, PopoverTrigger } from '@usertour/popover';
import { isEmptyString } from '@usertour/helpers';
import type { RulesCondition } from '@usertour/types';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { validateActions } from '../../actions';
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

  // Actions completeness check. Question elements expose an optional
  // `actions` list (e.g., "When answer is submitted"). Earlier the chip
  // only flagged a missing question name; an incomplete action inside
  // that list lit the inner Action chip red but left the outer question
  // chip looking fine — same inconsistency the button element had.
  // Surfacing it here so the outer chip mirrors any inner red state.
  const { t } = useTranslation();
  const actionsResult = useMemo<ValidationResult>(() => {
    const actions = (localData as { actions?: RulesCondition[] }).actions;
    if (!actions || actions.length === 0) {
      return { isValid: true };
    }
    const failures = validateActions(actions, {
      attributes,
      contents: contentList,
      currentVersion,
      currentStep,
    });
    if (failures.length === 0) {
      return { isValid: true };
    }
    return {
      isValid: false,
      errorMessage: t('actions.errors.question.incomplete'),
    };
  }, [localData, attributes, contentList, currentVersion, currentStep, t]);

  // Validation result — element-specific validate runs first so a missing
  // name / invalid range surfaces with its own message ahead of any
  // actions issue.
  const elementResult = useMemo(() => validate(localData), [validate, localData]);
  const validationResult = elementResult.isValid ? actionsResult : elementResult;

  // Update error state when validation changes
  useEffect(() => {
    setOpenError(!validationResult.isValid && !isOpen);
  }, [validationResult.isValid, isOpen]);

  // Handle popover open/close. Element-level hard validation (missing
  // question name, invalid scale range) gates the commit — those errors
  // mean the persisted shape would be unusable. Actions-level errors
  // (incomplete action chips) only gate the *outer* red indicator, not
  // the commit: actions are persisted as-is so that what the user sees
  // in the popover chips matches what reaches storage / the save gate.
  // Without this split, an incomplete-action chip would be red yet
  // silently revert to the prior committed state on close, and a
  // subsequent Save would persist the *previous* (often empty) actions
  // list — a confusing "chip says red but save shows nothing".
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);

      if (open) {
        setOpenError(false);
        return;
      }

      // Hard validation gate (element-specific only).
      if (!elementResult.isValid) {
        setOpenError(true);
        return;
      }

      // Outer red indicator: still shown when actions are incomplete.
      // The commit below proceeds either way so persisted state matches
      // the chips visible inside the popover.
      if (!actionsResult.isValid) {
        setOpenError(true);
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
    [elementResult.isValid, actionsResult.isValid, localData, element, id, updateElement],
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
