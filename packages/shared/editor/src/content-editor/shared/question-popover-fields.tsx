// Shared popover field components for question editors (NPS, Scale, Star Rating)

import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { memo } from 'react';

import { ContentActions } from '../../actions';
import type { RulesCondition } from '@usertour/types';

// Types
export interface QuestionContextProps {
  zIndex: number;
  currentStep: any;
  currentVersion: any;
  contentList: any;
  createStep: any;
  attributes: any;
  projectId: string;
}

// Question Name Field Component
interface QuestionNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  id?: string;
  placeholder?: string;
}

export const QuestionNameField = memo<QuestionNameFieldProps>(
  ({ value, onChange, error, id = 'question-name', placeholder = 'Question name?' }) => (
    <>
      <Label htmlFor={id}>Question name</Label>
      <Input
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  ),
);

QuestionNameField.displayName = 'QuestionNameField';

// Content Actions Field Component
interface ContentActionsFieldProps {
  actions?: RulesCondition[];
  onActionsChange: (actions: RulesCondition[]) => void;
  contextProps: QuestionContextProps;
}

export const ContentActionsField = memo<ContentActionsFieldProps>(
  ({ actions, onActionsChange, contextProps }) => {
    const { zIndex, currentStep, currentVersion, contentList, createStep, attributes } =
      contextProps;

    return (
      <>
        <Label>When answer is submitted</Label>
        <ContentActions
          zIndex={zIndex}
          isShowIf={false}
          isShowLogic={false}
          currentStep={currentStep}
          currentVersion={currentVersion}
          onDataChange={onActionsChange}
          defaultConditions={actions || []}
          attributes={attributes}
          contents={contentList}
          createStep={createStep}
        />
      </>
    );
  },
);

ContentActionsField.displayName = 'ContentActionsField';

// Labels Field Component (low/high with tooltip)
interface LabelsFieldProps {
  lowLabel?: string;
  highLabel?: string;
  onLowLabelChange: (value: string) => void;
  onHighLabelChange: (value: string) => void;
  lowPlaceholder?: string;
  highPlaceholder?: string;
}

export const LabelsField = memo<LabelsFieldProps>(
  ({
    lowLabel,
    highLabel,
    onLowLabelChange,
    onHighLabelChange,
    lowPlaceholder = 'Default',
    highPlaceholder = 'Default',
  }) => (
    <>
      <Label className="flex items-center gap-1">
        Labels
        <QuestionTooltip>
          Below each option, provide labels to clearly convey their meaning, such as "Bad"
          positioned under the left option and "Good" under the right.
        </QuestionTooltip>
      </Label>
      <div className="flex flex-row gap-2">
        <Input
          type="text"
          value={lowLabel || ''}
          placeholder={lowPlaceholder}
          onChange={(e) => onLowLabelChange(e.target.value)}
        />
        <Input
          type="text"
          value={highLabel || ''}
          placeholder={highPlaceholder}
          onChange={(e) => onHighLabelChange(e.target.value)}
        />
      </div>
    </>
  ),
);

LabelsField.displayName = 'LabelsField';

// Scale Range Field Component (for scale and star-rating)
interface ScaleRangeFieldProps {
  lowRange: number;
  highRange: number;
  onLowRangeChange: (value: number) => void;
  onHighRangeChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  lowDisabled?: boolean;
  error?: string;
  lowPlaceholder?: string;
  highPlaceholder?: string;
  // If true, highRange min will be lowRange + 1; otherwise it will be minValue
  highMinFollowsLow?: boolean;
}

export const ScaleRangeField = memo<ScaleRangeFieldProps>(
  ({
    lowRange,
    highRange,
    onLowRangeChange,
    onHighRangeChange,
    minValue = 0,
    maxValue = 100,
    lowDisabled = false,
    error,
    lowPlaceholder = '0',
    highPlaceholder = '10',
    highMinFollowsLow = false,
  }) => {
    const handleLowRangeChange = (value: string) => {
      const numValue = Number(value);
      if (!Number.isNaN(numValue)) {
        onLowRangeChange(numValue);
      }
    };

    const handleHighRangeChange = (value: string) => {
      const numValue = Number(value);
      if (!Number.isNaN(numValue)) {
        onHighRangeChange(numValue);
      }
    };

    // Determine highRange min value based on configuration
    const highMin = highMinFollowsLow ? lowRange + 1 : minValue;

    return (
      <>
        <Label className="flex items-center gap-1">Scale range</Label>
        <div className="flex flex-row gap-2 items-center">
          <Input
            type="number"
            value={lowRange}
            placeholder={lowPlaceholder}
            min={minValue}
            max={maxValue}
            disabled={lowDisabled}
            onChange={(e) => handleLowRangeChange(e.target.value)}
            aria-describedby={error ? 'range-error' : undefined}
          />
          <p>-</p>
          <Input
            type="number"
            value={highRange}
            placeholder={highPlaceholder}
            min={highMin}
            max={maxValue}
            onChange={(e) => handleHighRangeChange(e.target.value)}
            aria-describedby={error ? 'range-error' : undefined}
          />
        </div>
        {error && (
          <p id="range-error" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </>
    );
  },
);

ScaleRangeField.displayName = 'ScaleRangeField';
