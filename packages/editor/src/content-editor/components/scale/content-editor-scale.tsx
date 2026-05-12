// Main editable scale component

import { isEmptyString } from '@usertour/helpers';
import { Scale, validateScaleRange } from '@usertour-packages/widget';
import { memo, useCallback, useMemo } from 'react';

import type { ContentEditorScaleElement } from '../../../types/editor';
import { BindAttribute } from '../../shared/bind-attribute';
import {
  QuestionEditorBase,
  QuestionNameField,
  ContentActionsField,
  LabelsField,
  ScaleRangeField,
} from '../../shared';
import type { QuestionContextProps, ValidationResult } from '../../shared';

// Validation function for scale
const validateScale = (data: ContentEditorScaleElement['data']): ValidationResult => {
  if (isEmptyString(data.name)) {
    return { isValid: false, errorMessage: 'Question name is required' };
  }
  if (!validateScaleRange(data.lowRange, data.highRange)) {
    return {
      isValid: false,
      errorMessage: 'Invalid range: low must be ≤ high, and both must be between 0-100',
    };
  }
  return { isValid: true };
};

// Memoized Popover Content component
const ScalePopoverContent = memo(
  ({
    localData,
    handleDataChange,
    contextProps,
  }: {
    localData: ContentEditorScaleElement['data'];
    handleDataChange: (data: Partial<ContentEditorScaleElement['data']>) => void;
    contextProps: QuestionContextProps;
  }) => {
    const isRangeValid = useMemo(
      () => validateScaleRange(localData.lowRange, localData.highRange),
      [localData.lowRange, localData.highRange],
    );

    return (
      <div className="flex flex-col gap-2.5">
        <QuestionNameField
          id="scale-question"
          value={localData.name}
          onChange={(name) => handleDataChange({ name })}
          error={isEmptyString(localData.name) ? 'Question name is required' : undefined}
        />

        <ContentActionsField
          actions={localData.actions}
          onActionsChange={(actions) => handleDataChange({ actions })}
          contextProps={contextProps}
        />

        <ScaleRangeField
          lowRange={localData.lowRange}
          highRange={localData.highRange}
          onLowRangeChange={(lowRange) => handleDataChange({ lowRange })}
          onHighRangeChange={(highRange) => handleDataChange({ highRange })}
          minValue={0}
          maxValue={100}
          error={
            !isRangeValid
              ? 'Invalid range: low must be ≤ high, and both must be between 0-100'
              : undefined
          }
        />

        <LabelsField
          lowLabel={localData.lowLabel}
          highLabel={localData.highLabel}
          onLowLabelChange={(lowLabel) => handleDataChange({ lowLabel })}
          onHighLabelChange={(highLabel) => handleDataChange({ highLabel })}
          lowPlaceholder="Low label"
          highPlaceholder="High label"
        />

        <BindAttribute
          zIndex={contextProps.zIndex}
          bindToAttribute={localData.bindToAttribute || false}
          selectedAttribute={localData.selectedAttribute}
          projectId={contextProps.projectId}
          onBindChange={(checked) => handleDataChange({ bindToAttribute: checked })}
          onAttributeChange={(value) => handleDataChange({ selectedAttribute: value })}
        />
      </div>
    );
  },
);

ScalePopoverContent.displayName = 'ScalePopoverContent';

export interface ContentEditorScaleProps {
  element: ContentEditorScaleElement;
  id: string;
  path: number[];
}

// Main Editor Component
export const ContentEditorScale = memo((props: ContentEditorScaleProps) => {
  const { element, id } = props;

  const renderDisplay = useCallback(
    (localData: ContentEditorScaleElement['data']) => (
      <Scale
        lowRange={localData.lowRange}
        highRange={localData.highRange}
        lowLabel={localData.lowLabel}
        highLabel={localData.highLabel}
        isInteractive={false}
      />
    ),
    [],
  );

  const renderPopoverContent = useCallback(
    (contentProps: {
      localData: ContentEditorScaleElement['data'];
      handleDataChange: (data: Partial<ContentEditorScaleElement['data']>) => void;
      contextProps: QuestionContextProps;
    }) => <ScalePopoverContent {...contentProps} />,
    [],
  );

  return (
    <QuestionEditorBase
      element={element}
      id={id}
      validate={validateScale}
      renderDisplay={renderDisplay}
      renderPopoverContent={renderPopoverContent}
      popoverClassName="z-50 w-72 rounded-md border bg-background p-4"
    />
  );
});

ContentEditorScale.displayName = 'ContentEditorScale';
