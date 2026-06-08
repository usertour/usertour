// Shared popover field components for question editors (NPS, Scale, Star Rating)

import { Input, Label, QuestionTooltip, TextField } from '@usertour/ui';
import { memo } from 'react';

import { useTranslation } from 'react-i18next';
import { Actions } from '../../actions';
import type { Attribute, Content, ContentVersion, RulesCondition, Step } from '@usertour/types';

// Types
export interface QuestionContextProps {
  zIndex: number;
  currentStep?: Step;
  currentVersion?: ContentVersion;
  contentList?: Content[];
  createStep?: (
    currentVersion: ContentVersion,
    sequence: number,
    stepType?: string,
    duplicateStep?: Step,
  ) => Promise<Step | undefined>;
  attributes?: Attribute[];
  projectId: string;
}

// Question Name Field Component
interface QuestionNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

export const QuestionNameField = memo<QuestionNameFieldProps>(
  ({ value, onChange, error, placeholder }) => {
    const { t } = useTranslation();
    return (
      <TextField
        label={t('contentBuilder.editor.question.name')}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder ?? t('contentBuilder.editor.question.namePlaceholder')}
        error={error}
      />
    );
  },
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
    const { t } = useTranslation();

    return (
      <>
        <Label>{t('contentBuilder.editor.question.whenSubmitted')}</Label>
        <Actions
          baseZIndex={zIndex}
          currentStep={currentStep}
          currentVersion={currentVersion}
          onChange={onActionsChange}
          conditions={actions || []}
          attributes={attributes}
          contents={contentList}
          createStep={createStep}
          t={t}
        />
      </>
    );
  },
);

ContentActionsField.displayName = 'ContentActionsField';

// Labels Field Component (low/high with tooltip). One label governs two
// side-by-side inputs, so it keeps a bespoke layout rather than two TextFields.
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
    lowPlaceholder,
    highPlaceholder,
  }) => {
    const { t } = useTranslation();
    return (
      <div className="flex flex-col space-y-2">
        <Label className="flex items-center gap-1">
          {t('contentBuilder.editor.question.labels')}
          <QuestionTooltip>{t('contentBuilder.editor.question.labelsTooltip')}</QuestionTooltip>
        </Label>
        <div className="flex flex-row gap-2">
          <Input
            variant="compact-muted"
            type="text"
            value={lowLabel || ''}
            placeholder={lowPlaceholder ?? t('contentBuilder.editor.question.defaultLabel')}
            onChange={(event) => onLowLabelChange(event.target.value)}
          />
          <Input
            variant="compact-muted"
            type="text"
            value={highLabel || ''}
            placeholder={highPlaceholder ?? t('contentBuilder.editor.question.defaultLabel')}
            onChange={(event) => onHighLabelChange(event.target.value)}
          />
        </div>
      </div>
    );
  },
);

LabelsField.displayName = 'LabelsField';

// Scale Range Field Component (for scale and star-rating). One label over two
// side-by-side numeric inputs joined by a dash — bespoke layout, not NumberField.
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
    const { t } = useTranslation();

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
      <div className="flex flex-col space-y-2">
        <Label className="flex items-center gap-1">
          {t('contentBuilder.editor.question.scaleRange')}
        </Label>
        <div className="flex flex-row gap-2 items-center">
          <Input
            variant="compact-muted"
            type="number"
            value={lowRange}
            placeholder={lowPlaceholder}
            min={minValue}
            max={maxValue}
            disabled={lowDisabled}
            onChange={(event) => handleLowRangeChange(event.target.value)}
            aria-describedby={error ? 'range-error' : undefined}
          />
          <p>-</p>
          <Input
            variant="compact-muted"
            type="number"
            value={highRange}
            placeholder={highPlaceholder}
            min={highMin}
            max={maxValue}
            onChange={(event) => handleHighRangeChange(event.target.value)}
            aria-describedby={error ? 'range-error' : undefined}
          />
        </div>
        {error && (
          <p id="range-error" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },
);

ScaleRangeField.displayName = 'ScaleRangeField';
