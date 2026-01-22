import * as Widget from '@usertour-packages/widget';
import { isEmptyString } from '@usertour/helpers';
import { forwardRef, memo, useCallback, useMemo } from 'react';

import type { ContentEditorScaleElement } from '../../types/editor';
import { BindAttribute } from './bind-attribute';
import {
  QuestionEditorBase,
  QuestionNameField,
  ContentActionsField,
  LabelsField,
  ScaleRangeField,
  useQuestionSerialize,
} from '../shared';
import type { QuestionContextProps, ValidationResult } from '../shared';

// Constants
const BUTTON_BASE_CLASS =
  'flex items-center overflow-hidden group relative border bg-sdk-question/10 text-sdk-question border-sdk-question hover:text-sdk-question hover:border-sdk-question hover:bg-sdk-question/40 rounded-md main-transition p-2 justify-center w-auto min-w-0';

const SCALE_GRID_CLASS = 'grid gap-1.5 !gap-1';
const LABELS_CONTAINER_CLASS =
  'flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80';

// Utility functions
const calculateScaleLength = (lowRange: number, highRange: number): number => {
  return Math.max(0, highRange - lowRange + 1);
};

const validateScaleRange = (lowRange: number, highRange: number): boolean => {
  return lowRange <= highRange && lowRange >= 0 && highRange <= 100;
};

// Memoized Scale Button Component
const ScaleButton = memo<{ value: number; onClick?: () => void; isInteractive?: boolean }>(
  ({ value, onClick, isInteractive = true }) => (
    <Widget.Button
      variant="custom"
      className={BUTTON_BASE_CLASS}
      onClick={onClick}
      disabled={!isInteractive}
      aria-label={`Scale option ${value}`}
    >
      {value}
    </Widget.Button>
  ),
);

ScaleButton.displayName = 'ScaleButton';

// Scale Display Component Props
interface ScaleDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  lowRange: number;
  highRange: number;
  lowLabel?: string;
  highLabel?: string;
  onValueChange?: (element: ContentEditorScaleElement, value: number) => void;
  element?: ContentEditorScaleElement;
}

// Memoized Scale Display Component with forwardRef for Radix compatibility
const ScaleDisplay = memo(
  forwardRef<HTMLDivElement, ScaleDisplayProps>(
    ({ lowRange, highRange, lowLabel, highLabel, onValueChange, element, ...props }, ref) => {
      const scaleValues = useMemo(() => {
        const length = calculateScaleLength(lowRange, highRange);
        return Array.from({ length }, (_, i) => lowRange + i);
      }, [lowRange, highRange]);
      const scaleLength = scaleValues.length;

      const handleValueChange = useCallback(
        (value: number) => {
          if (onValueChange && element) {
            onValueChange(element, value);
          }
        },
        [onValueChange, element],
      );

      return (
        <div ref={ref} className="w-full" {...props}>
          <div
            className={SCALE_GRID_CLASS}
            style={{
              gridTemplateColumns: `repeat(${scaleLength}, minmax(0px, 1fr))`,
            }}
            role="radiogroup"
            aria-label="Scale options"
          >
            {scaleValues.map((value) => (
              <ScaleButton
                key={value}
                value={value}
                onClick={() => handleValueChange(value)}
                isInteractive={!!onValueChange}
              />
            ))}
          </div>
          {(lowLabel || highLabel) && (
            <div className={LABELS_CONTAINER_CLASS}>
              <p>{lowLabel}</p>
              <p>{highLabel}</p>
            </div>
          )}
        </div>
      );
    },
  ),
);

ScaleDisplay.displayName = 'ScaleDisplay';

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
export const ContentEditorScale = (props: ContentEditorScaleProps) => {
  const { element, id } = props;

  const renderDisplay = useCallback(
    (localData: ContentEditorScaleElement['data']) => (
      <ScaleDisplay
        lowRange={localData.lowRange}
        highRange={localData.highRange}
        lowLabel={localData.lowLabel}
        highLabel={localData.highLabel}
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
};

ContentEditorScale.displayName = 'ContentEditorScale';

// Serialize Component
export type ContentEditorScaleSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorScaleElement;
  onClick?: (element: ContentEditorScaleElement, value: number) => Promise<void>;
};

export const ContentEditorScaleSerialize = memo<ContentEditorScaleSerializeType>((props) => {
  const { element, onClick } = props;
  const { loading, handleClick } = useQuestionSerialize(element, onClick);

  const handleScaleClick = useCallback(
    (_el: ContentEditorScaleElement, value: number) => {
      if (!loading) {
        handleClick(value);
      }
    },
    [loading, handleClick],
  );

  return (
    <ScaleDisplay
      lowRange={element.data.lowRange}
      highRange={element.data.highRange}
      lowLabel={element.data.lowLabel}
      highLabel={element.data.highLabel}
      onValueChange={loading ? undefined : handleScaleClick}
      element={element}
    />
  );
});

ContentEditorScaleSerialize.displayName = 'ContentEditorScaleSerialize';
