// Popover form content for multiple choice editor

import {
  BooleanField,
  Button,
  Input,
  Label,
  TextField,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { DeleteIcon, PlusIcon } from '@usertour/icons';
import { BizAttributeTypes } from '@usertour/types';
import { memo, useCallback, useMemo } from 'react';

import { useTranslation } from 'react-i18next';
import { Actions } from '../../../actions';
import type {
  ContentEditorMultipleChoiceElement,
  ContentEditorMultipleChoiceOption,
} from '../../../types/editor';
import { BindAttribute } from '../../shared/bind-attribute';
import type { QuestionContextProps } from '../../shared';

interface MultipleChoicePopoverContentProps {
  localData: ContentEditorMultipleChoiceElement['data'];
  handleDataChange: (data: Partial<ContentEditorMultipleChoiceElement['data']>) => void;
  contextProps: QuestionContextProps;
}

export const MultipleChoicePopoverContent = memo(
  ({ localData, handleDataChange, contextProps }: MultipleChoicePopoverContentProps) => {
    const { zIndex, currentStep, currentVersion, contentList, createStep, attributes, projectId } =
      contextProps;
    const { t } = useTranslation();

    // Handle option field change
    const handleOptionChange = useCallback(
      (index: number, field: keyof ContentEditorMultipleChoiceOption, value: string | boolean) => {
        const newOptions = [...localData.options];
        newOptions[index] = { ...newOptions[index], [field]: value };
        handleDataChange({ options: newOptions });
      },
      [localData.options, handleDataChange],
    );

    const handleAddOption = useCallback(() => {
      handleDataChange({
        options: [...localData.options, { label: '', value: '', checked: false }],
      });
    }, [localData.options, handleDataChange]);

    const handleRemoveOption = useCallback(
      (index: number) => {
        handleDataChange({
          options: localData.options.filter((_, i) => i !== index),
        });
      },
      [localData.options, handleDataChange],
    );

    // Memoize options list to prevent unnecessary re-renders
    const optionsList = useMemo(
      () =>
        localData.options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <Input
              variant="compact-surface"
              value={option.value ?? ''}
              onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
              placeholder={t('contentBuilder.editor.multipleChoice.optionValue')}
            />
            <Input
              variant="compact-surface"
              value={option.label ?? ''}
              onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
              placeholder={t('contentBuilder.editor.multipleChoice.optionLabel')}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="flex-none hover:bg-destructive/20"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOption(index)}
                  >
                    <DeleteIcon className="fill-destructive" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {t('contentBuilder.editor.multipleChoice.removeOption')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )),
      [localData.options, handleOptionChange, handleRemoveOption, t],
    );

    return (
      <div className="flex flex-col gap-4">
        <TextField
          label={t('contentBuilder.editor.question.name')}
          value={localData.name || ''}
          onChange={(value) => handleDataChange({ name: value })}
          placeholder={t('contentBuilder.editor.multipleChoice.namePlaceholder')}
        />

        <Label>{t('contentBuilder.editor.question.whenSubmitted')}</Label>
        <Actions
          baseZIndex={zIndex}
          currentStep={currentStep}
          currentVersion={currentVersion}
          onChange={(actions) => handleDataChange({ actions })}
          conditions={localData.actions || []}
          attributes={attributes}
          contents={contentList}
          createStep={createStep}
          t={t}
        />

        <div className="space-y-2">
          <Label>{t('contentBuilder.editor.multipleChoice.options')}</Label>
          {optionsList}
          <Button onClick={handleAddOption} size="sm" variant="link" className="hover:no-underline">
            <PlusIcon width={16} height={16} />
            {t('contentBuilder.editor.multipleChoice.addOption')}
          </Button>
        </div>

        {localData.allowMultiple && (
          <>
            <Label className="flex items-center gap-1">
              {t('contentBuilder.editor.multipleChoice.numberRequired')}
            </Label>
            <div className="flex flex-row gap-2 items-center">
              <Input
                variant="compact-surface"
                type="number"
                value={localData.lowRange ?? ''}
                placeholder={t('contentBuilder.editor.question.defaultLabel')}
                onChange={(e) => handleDataChange({ lowRange: Number(e.target.value) })}
              />
              <p>-</p>
              <Input
                variant="compact-surface"
                type="number"
                value={localData.highRange ?? ''}
                placeholder={t('contentBuilder.editor.question.defaultLabel')}
                onChange={(e) => handleDataChange({ highRange: Number(e.target.value) })}
              />
            </div>
            <TextField
              label={t('contentBuilder.editor.multipleChoice.submitButton')}
              value={localData.buttonText ?? ''}
              onChange={(value) => handleDataChange({ buttonText: value })}
              placeholder={t('contentBuilder.editor.multipleChoice.submitButtonPlaceholder')}
            />
          </>
        )}

        <div className="space-y-2">
          <BooleanField
            label={t('contentBuilder.editor.multipleChoice.shuffle')}
            checked={localData.shuffleOptions}
            onChange={(checked) => handleDataChange({ shuffleOptions: checked })}
          />

          <BooleanField
            label={t('contentBuilder.editor.multipleChoice.enableOther')}
            checked={localData.enableOther}
            onChange={(checked) => handleDataChange({ enableOther: checked })}
          />

          {localData.enableOther && (
            <div className="ml-8">
              <TextField
                label={t('contentBuilder.editor.multipleChoice.otherPlaceholder')}
                value={localData.otherPlaceholder || ''}
                onChange={(value) => handleDataChange({ otherPlaceholder: value })}
                placeholder={t('contentBuilder.editor.multipleChoice.otherPlaceholderHint')}
              />
            </div>
          )}

          <BooleanField
            label={t('contentBuilder.editor.multipleChoice.allowMultiple')}
            checked={localData.allowMultiple}
            onChange={(checked) => handleDataChange({ allowMultiple: checked })}
          />

          <BindAttribute
            zIndex={zIndex}
            popoverContentClassName="w-[350px]"
            bindToAttribute={localData.bindToAttribute || false}
            selectedAttribute={localData.selectedAttribute}
            onBindChange={(checked) => handleDataChange({ bindToAttribute: checked })}
            onAttributeChange={(value) => handleDataChange({ selectedAttribute: value })}
            dataType={localData.allowMultiple ? BizAttributeTypes.List : BizAttributeTypes.String}
            projectId={projectId}
          />
        </div>
      </div>
    );
  },
);

MultipleChoicePopoverContent.displayName = 'MultipleChoicePopoverContent';
