import * as Popover from '@radix-ui/react-popover';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { useCallback, useEffect, useState, useMemo, memo } from 'react';
import { ContentActions } from '../..';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import type { ContentEditorScaleElement } from '../../types/editor';
import { Button } from '@usertour-packages/button';
import { EditorError } from '../../components/editor-error';
import { EditorErrorContent } from '../../components/editor-error';
import { EditorErrorAnchor } from '../../components/editor-error';
import { isEmptyString } from '@usertour-packages/utils';
import { BindAttribute } from './bind-attribute';

// Constants
const BUTTON_BASE_CLASS =
  'flex items-center overflow-hidden group relative border bg-sdk-question/10 text-sdk-question border-sdk-question hover:text-sdk-question hover:border-sdk-question hover:bg-sdk-question/40 rounded-md main-transition p-2 justify-center w-auto min-w-0';

const SCALE_GRID_CLASS = 'grid gap-1.5 !gap-1';
const LABELS_CONTAINER_CLASS =
  'flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80';
const POPOVER_CONTENT_CLASS = 'z-50 w-72 rounded-md border bg-background p-4';
const FORM_CONTAINER_CLASS = 'flex flex-col gap-2.5';
const RANGE_INPUT_CONTAINER_CLASS = 'flex flex-row gap-2 items-center';
const LABELS_INPUT_CONTAINER_CLASS = 'flex flex-row gap-2';

// Types

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
    <Button
      className={BUTTON_BASE_CLASS}
      forSdk
      onClick={onClick}
      disabled={!isInteractive}
      aria-label={`Scale option ${value}`}
    >
      {value}
    </Button>
  ),
);

ScaleButton.displayName = 'ScaleButton';

// Memoized Scale Display Component
const ScaleDisplay = memo<{
  lowRange: number;
  highRange: number;
  lowLabel?: string;
  highLabel?: string;
  onClick?: (element: ContentEditorScaleElement, value: number) => void;
  element?: ContentEditorScaleElement;
}>(({ lowRange, highRange, lowLabel, highLabel, onClick, element }) => {
  const scaleValues = useMemo(() => {
    const length = calculateScaleLength(lowRange, highRange);
    return Array.from({ length }, (_, i) => lowRange + i);
  }, [lowRange, highRange]);
  const scaleLength = scaleValues.length;

  const handleButtonClick = useCallback(
    (value: number) => {
      if (onClick && element) {
        onClick(element, value);
      }
    },
    [onClick, element],
  );

  if (scaleLength === 0) {
    return (
      <div className="w-full p-4 text-center text-gray-500 border border-dashed rounded-md">
        Invalid scale range
      </div>
    );
  }

  return (
    <div className="w-full">
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
            onClick={() => handleButtonClick(value)}
            isInteractive={!!onClick}
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
});

ScaleDisplay.displayName = 'ScaleDisplay';

interface ContentEditorScaleProps {
  element: ContentEditorScaleElement;
  id: string;
  path: number[];
}

// Main Editor Component
export const ContentEditorScale = (props: ContentEditorScaleProps) => {
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
  const [openError, setOpenError] = useState<boolean>(false);
  const [localData, setLocalData] = useState(element.data);
  const [validationErrors, setValidationErrors] = useState<{
    range?: string;
    name?: string;
  }>({});

  // Memoized calculations
  const isRangeValid = useMemo(
    () => validateScaleRange(localData.lowRange, localData.highRange),
    [localData.lowRange, localData.highRange],
  );

  const handleDataChange = useCallback(
    (data: Partial<ContentEditorScaleElement['data']>) => {
      setLocalData((prevData) => ({ ...prevData, ...data }));

      // Clear validation errors when user starts typing
      if (data.name !== undefined) {
        setValidationErrors((prev) => ({ ...prev, name: undefined }));
        // Clear error state if user is typing and popover is closed
        if (!isOpen && !isEmptyString(data.name)) {
          setOpenError(false);
        }
      }
      if (data.lowRange !== undefined || data.highRange !== undefined) {
        setValidationErrors((prev) => ({ ...prev, range: undefined }));
        // Clear error state if user is typing and popover is closed
        if (
          !isOpen &&
          validateScaleRange(
            data.lowRange !== undefined ? data.lowRange : localData.lowRange,
            data.highRange !== undefined ? data.highRange : localData.highRange,
          )
        ) {
          setOpenError(false);
        }
      }
    },
    [isOpen, localData.lowRange, localData.highRange],
  );

  // Validation effect
  useEffect(() => {
    const errors: typeof validationErrors = {};

    if (isEmptyString(localData.name)) {
      errors.name = 'Question name is required';
    }

    if (!isRangeValid) {
      errors.range = 'Invalid range: low must be ≤ high, and both must be between 0-100';
    }

    setValidationErrors(errors);
  }, [localData.name, isRangeValid]);

  // Error display effect
  useEffect(() => {
    setOpenError(isEmptyString(localData.name) && !isOpen);
  }, [localData.name, isOpen]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);

      if (open) {
        // When opening, clear any existing errors
        setOpenError(false);
        return;
      }

      // When closing, check for validation errors
      const hasNameError = isEmptyString(localData.name);
      const hasRangeError = !isRangeValid;

      if (hasNameError || hasRangeError) {
        // Show error if there are validation issues
        setOpenError(true);
        return;
      }

      // Only save if there are no validation errors
      updateElement(
        {
          ...element,
          data: localData,
        },
        id,
      );
    },
    [localData, element, id, updateElement, isRangeValid],
  );

  const handleRangeChange = useCallback(
    (field: 'lowRange' | 'highRange', value: string) => {
      const numValue = Number(value);
      if (!Number.isNaN(numValue)) {
        handleDataChange({ [field]: numValue });
      }
    },
    [handleDataChange],
  );

  return (
    <EditorError open={openError}>
      <EditorErrorAnchor className="w-full">
        <Popover.Root onOpenChange={handleOpenChange} open={isOpen}>
          <Popover.Trigger asChild>
            <div className="w-full">
              <ScaleDisplay
                lowRange={localData.lowRange}
                highRange={localData.highRange}
                lowLabel={localData.lowLabel}
                highLabel={localData.highLabel}
              />
            </div>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className={POPOVER_CONTENT_CLASS}
              style={{ zIndex }}
              sideOffset={10}
              side="right"
            >
              <div className={FORM_CONTAINER_CLASS}>
                <Label htmlFor="scale-question">Question name</Label>
                <Input
                  id="scale-question"
                  value={localData.name}
                  onChange={(e) => handleDataChange({ name: e.target.value })}
                  placeholder="Question name?"
                  aria-describedby={validationErrors.name ? 'name-error' : undefined}
                />
                {validationErrors.name && (
                  <p id="name-error" className="text-sm text-red-500">
                    {validationErrors.name}
                  </p>
                )}

                <Label>When answer is submitted</Label>
                <ContentActions
                  zIndex={zIndex}
                  isShowIf={false}
                  isShowLogic={false}
                  currentStep={currentStep}
                  currentVersion={currentVersion}
                  onDataChange={(actions) => handleDataChange({ actions })}
                  defaultConditions={localData.actions || []}
                  attributes={attributes}
                  contents={contentList}
                  createStep={createStep}
                />

                <Label className="flex items-center gap-1">Scale range</Label>
                <div className={RANGE_INPUT_CONTAINER_CLASS}>
                  <Input
                    type="number"
                    value={localData.lowRange}
                    placeholder="0"
                    min={0}
                    max={100}
                    onChange={(e) => handleRangeChange('lowRange', e.target.value)}
                    aria-describedby={validationErrors.range ? 'range-error' : undefined}
                  />
                  <p>-</p>
                  <Input
                    type="number"
                    value={localData.highRange}
                    placeholder="10"
                    min={0}
                    max={100}
                    onChange={(e) => handleRangeChange('highRange', e.target.value)}
                    aria-describedby={validationErrors.range ? 'range-error' : undefined}
                  />
                </div>
                {validationErrors.range && (
                  <p id="range-error" className="text-sm text-red-500">
                    {validationErrors.range}
                  </p>
                )}

                <Label className="flex items-center gap-1">
                  Labels
                  <QuestionTooltip>
                    Below each option, provide labels to clearly convey their meaning, such as "Bad"
                    positioned under the left option and "Good" under the right.
                  </QuestionTooltip>
                </Label>
                <div className={LABELS_INPUT_CONTAINER_CLASS}>
                  <Input
                    type="text"
                    value={localData.lowLabel || ''}
                    placeholder="Low label"
                    onChange={(e) => handleDataChange({ lowLabel: e.target.value })}
                  />
                  <Input
                    type="text"
                    value={localData.highLabel || ''}
                    placeholder="High label"
                    onChange={(e) => handleDataChange({ highLabel: e.target.value })}
                  />
                </div>

                <BindAttribute
                  zIndex={zIndex}
                  bindToAttribute={localData.bindToAttribute || false}
                  selectedAttribute={localData.selectedAttribute}
                  projectId={projectId}
                  onBindChange={(checked) => handleDataChange({ bindToAttribute: checked })}
                  onAttributeChange={(value) => handleDataChange({ selectedAttribute: value })}
                />
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </EditorErrorAnchor>
      <EditorErrorContent side="bottom" style={{ zIndex: zIndex }}>
        {isEmptyString(localData.name)
          ? 'Question name is required'
          : !isRangeValid
            ? 'Invalid scale range'
            : 'Please fix the errors above'}
      </EditorErrorContent>
    </EditorError>
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
  const [loading, setLoading] = useState(false);

  const handleClick = async (el: any, value: number) => {
    if (onClick) {
      setLoading(true);
      try {
        await onClick(el, value);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <ScaleDisplay
      lowRange={element.data.lowRange}
      highRange={element.data.highRange}
      lowLabel={element.data.lowLabel}
      highLabel={element.data.highLabel}
      onClick={loading ? undefined : handleClick}
      element={element}
    />
  );
});

ContentEditorScaleSerialize.displayName = 'ContentEditorScaleSerialize';
