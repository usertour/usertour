// Popover form content for multiple choice editor

import { Button } from '@usertour-packages/button';
import { DeleteIcon, PlusIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { Switch } from '@usertour-packages/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { BizAttributeTypes } from '@usertour/types';
import { memo, useCallback, useMemo } from 'react';

import { ContentActions } from '../../../actions';
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
              value={option.value ?? ''}
              onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
              placeholder="Value"
            />
            <Input
              value={option.label ?? ''}
              onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
              placeholder="Option label"
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
                <TooltipContent className="max-w-xs">Remove option</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )),
      [localData.options, handleOptionChange, handleRemoveOption],
    );

    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="question-name">Question name</Label>
          <Input
            id="question-name"
            value={localData.name || ''}
            onChange={(e) => handleDataChange({ name: e.target.value })}
            placeholder="Enter question name"
          />
        </div>

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

        <div className="space-y-2">
          <Label>Options</Label>
          {optionsList}
          <Button onClick={handleAddOption} size="sm" variant="link" className="hover:no-underline">
            <PlusIcon width={16} height={16} />
            Add answer option
          </Button>
        </div>

        {localData.allowMultiple && (
          <>
            <Label className="flex items-center gap-1">Number of options required</Label>
            <div className="flex flex-row gap-2 items-center">
              <Input
                type="number"
                value={localData.lowRange ?? ''}
                placeholder="Default"
                onChange={(e) => handleDataChange({ lowRange: Number(e.target.value) })}
              />
              <p>-</p>
              <Input
                type="number"
                value={localData.highRange ?? ''}
                placeholder="Default"
                onChange={(e) => handleDataChange({ highRange: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="button-text">Submit button text</Label>
              <Input
                id="button-text"
                value={localData.buttonText ?? ''}
                onChange={(e) => handleDataChange({ buttonText: e.target.value })}
                placeholder="Enter button text"
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="shuffle"
              checked={localData.shuffleOptions}
              className="data-[state=unchecked]:bg-muted"
              onCheckedChange={(checked) => handleDataChange({ shuffleOptions: checked })}
            />
            <Label htmlFor="shuffle">Shuffle option order</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="other"
              checked={localData.enableOther}
              className="data-[state=unchecked]:bg-muted"
              onCheckedChange={(checked) => handleDataChange({ enableOther: checked })}
            />
            <Label htmlFor="other">Enable "Other" option</Label>
          </div>

          {localData.enableOther && (
            <div className="space-y-2 ml-8">
              <Label htmlFor="other-placeholder">Other option placeholder</Label>
              <Input
                id="other-placeholder"
                value={localData.otherPlaceholder || ''}
                onChange={(e) => handleDataChange({ otherPlaceholder: e.target.value })}
                placeholder="Other..."
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="multiple"
              checked={localData.allowMultiple}
              className="data-[state=unchecked]:bg-muted"
              onCheckedChange={(checked) => handleDataChange({ allowMultiple: checked })}
            />
            <Label htmlFor="multiple">Allow multiple selection</Label>
          </div>

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
