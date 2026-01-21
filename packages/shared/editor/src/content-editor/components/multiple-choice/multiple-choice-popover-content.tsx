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
import { BindAttribute } from '../bind-attribute';

interface MultipleChoicePopoverContentProps {
  localData: ContentEditorMultipleChoiceElement['data'];
  onDataChange: (data: Partial<ContentEditorMultipleChoiceElement['data']>) => void;
  onOptionChange: (
    index: number,
    field: keyof ContentEditorMultipleChoiceOption,
    value: string | boolean,
  ) => void;
  contextProps: {
    zIndex: number;
    currentStep: any;
    currentVersion: any;
    contentList: any;
    createStep: any;
    attributes: any;
    projectId: string;
  };
}

export const MultipleChoicePopoverContent = memo(
  ({
    localData,
    onDataChange,
    onOptionChange,
    contextProps,
  }: MultipleChoicePopoverContentProps) => {
    const { zIndex, currentStep, currentVersion, contentList, createStep, attributes, projectId } =
      contextProps;

    const handleAddOption = useCallback(() => {
      onDataChange({
        options: [...localData.options, { label: '', value: '', checked: false }],
      });
    }, [localData.options, onDataChange]);

    const handleRemoveOption = useCallback(
      (index: number) => {
        onDataChange({
          options: localData.options.filter((_, i) => i !== index),
        });
      },
      [localData.options, onDataChange],
    );

    // Memoize options list to prevent unnecessary re-renders
    const optionsList = useMemo(
      () =>
        localData.options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={option.value}
              onChange={(e) => onOptionChange(index, 'value', e.target.value)}
              placeholder="Value"
            />
            <Input
              value={option.label}
              onChange={(e) => onOptionChange(index, 'label', e.target.value)}
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
      [localData.options, onOptionChange, handleRemoveOption],
    );

    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="question-name">Question name</Label>
          <Input
            id="question-name"
            value={localData.name || ''}
            onChange={(e) => onDataChange({ name: e.target.value })}
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
          onDataChange={(actions) => onDataChange({ actions })}
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
                value={localData.lowRange}
                placeholder="Default"
                onChange={(e) => onDataChange({ lowRange: Number(e.target.value) })}
              />
              <p>-</p>
              <Input
                type="number"
                value={localData.highRange}
                placeholder="Default"
                onChange={(e) => onDataChange({ highRange: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="button-text">Submit button text</Label>
              <Input
                id="button-text"
                value={localData.buttonText}
                onChange={(e) => onDataChange({ buttonText: e.target.value })}
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
              onCheckedChange={(checked) => onDataChange({ shuffleOptions: checked })}
            />
            <Label htmlFor="shuffle">Shuffle option order</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="other"
              checked={localData.enableOther}
              className="data-[state=unchecked]:bg-muted"
              onCheckedChange={(checked) => onDataChange({ enableOther: checked })}
            />
            <Label htmlFor="other">Enable "Other" option</Label>
          </div>

          {localData.enableOther && (
            <div className="space-y-2 ml-8">
              <Label htmlFor="other-placeholder">Other option placeholder</Label>
              <Input
                id="other-placeholder"
                value={localData.otherPlaceholder || ''}
                onChange={(e) => onDataChange({ otherPlaceholder: e.target.value })}
                placeholder="Other..."
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="multiple"
              checked={localData.allowMultiple}
              className="data-[state=unchecked]:bg-muted"
              onCheckedChange={(checked) => onDataChange({ allowMultiple: checked })}
            />
            <Label htmlFor="multiple">Allow multiple selection</Label>
          </div>

          <BindAttribute
            zIndex={zIndex}
            popoverContentClassName="w-[350px]"
            bindToAttribute={localData.bindToAttribute || false}
            selectedAttribute={localData.selectedAttribute}
            onBindChange={(checked) => onDataChange({ bindToAttribute: checked })}
            onAttributeChange={(value) => onDataChange({ selectedAttribute: value })}
            dataType={localData.allowMultiple ? BizAttributeTypes.List : BizAttributeTypes.String}
            projectId={projectId}
          />
        </div>
      </div>
    );
  },
);

MultipleChoicePopoverContent.displayName = 'MultipleChoicePopoverContent';
