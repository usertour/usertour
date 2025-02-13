import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-ui/button';
import { Checkbox } from '@usertour-ui/checkbox';
import { DeleteIcon, PlusIcon } from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
import { Label } from '@usertour-ui/label';
import { RadioGroup, RadioGroupItem } from '@usertour-ui/radio-group';
import { Switch } from '@usertour-ui/switch';
import { TooltipContent } from '@usertour-ui/tooltip';
import { Tooltip, TooltipTrigger } from '@usertour-ui/tooltip';
import { TooltipProvider } from '@usertour-ui/tooltip';
import { RulesCondition } from '@usertour-ui/types';
import { useCallback, useState } from 'react';
import { ContentActions } from '../../actions';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import {
  ContentEditorMultipleChoiceElement,
  ContentEditorMultipleChoiceOption,
} from '../../types/editor';
export const ContentEditorMultipleChoice = (props: {
  element: ContentEditorMultipleChoiceElement;
  id: string;
  path: number[];
}) => {
  const { element, id } = props;
  const {
    updateElement,
    zIndex,
    currentStep,
    currentVersion,
    attributes,
    contentList,
    createStep,
  } = useContentEditorContext();
  const [isOpen, setIsOpen] = useState<boolean>();

  const handleDataChange = useCallback(
    (data: Partial<ContentEditorMultipleChoiceElement['data']>) => {
      updateElement(
        {
          ...element,
          data: { ...element.data, ...data },
        },
        id,
      );
    },
    [element, id, updateElement],
  );

  const handleOptionChange = (
    index: number,
    field: keyof ContentEditorMultipleChoiceOption,
    value: string | boolean,
  ) => {
    const newOptions = [...element.data.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    handleDataChange({ options: newOptions });
  };

  const addOption = () => {
    handleDataChange({
      options: [...element.data.options, { label: '', value: '', checked: false }],
    });
  };

  const removeOption = (index: number) => {
    const newOptions = element.data.options.filter((_, i) => i !== index);
    handleDataChange({ options: newOptions });
  };

  const handleActionChange = (actions: RulesCondition[]) => {
    handleDataChange({ actions });
  };

  return (
    <Popover.Root modal={true} onOpenChange={setIsOpen} open={isOpen}>
      <Popover.Trigger asChild>
        <div className="flex flex-col gap-2 w-full">
          <div className="space-y-2">
            {!element.data.allowMultiple ? (
              <RadioGroup defaultValue={element.data.options[0].value}>
                {element.data.options.map((option, index) => (
                  <div className="flex items-center space-x-2" key={index}>
                    <RadioGroupItem
                      value={option.value}
                      id={`r1${index}`}
                      className="border-sdk-question text-sdk-foreground"
                    />
                    <Label htmlFor={`r1${index}`} className="cursor-pointer">
                      {option.label || option.value}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="flex flex-col gap-2">
                {element.data.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Checkbox
                      checked={option.checked}
                      className="border-sdk-question data-[state=checked]:bg-sdk-question data-[state=checked]:text-sdk-foreground"
                      onCheckedChange={(checked) => handleOptionChange(index, 'checked', checked)}
                    />
                    <span>{option.label || option.value || `Option ${index + 1}`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-96 rounded-md border bg-background p-4"
          style={{ zIndex }}
        >
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="question-name">Question name</Label>
              <Input
                id="question-name"
                value={element.data.name}
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
              onDataChange={handleActionChange}
              defaultConditions={element?.data?.actions || []}
              attributes={attributes}
              contents={contentList}
              createStep={createStep}
            />

            <div className="space-y-2">
              <Label>Options</Label>
              {element.data.options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option.value}
                    onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                    placeholder="Value"
                  />
                  <Input
                    value={option.label}
                    onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                    placeholder="Option label"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="flex-none hover:bg-red-200"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          <DeleteIcon className="fill-red-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">Remove option</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}

              <Button
                onClick={addOption}
                size="sm"
                variant={'link'}
                className="hover:no-underline	"
              >
                <PlusIcon width={16} height={16} />
                Add answer option
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="shuffle"
                  checked={element.data.shuffleOptions}
                  className="data-[state=unchecked]:bg-muted"
                  onCheckedChange={(checked) => handleDataChange({ shuffleOptions: checked })}
                />
                <Label htmlFor="shuffle">Shuffle option order</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="other"
                  checked={element.data.enableOther}
                  className="data-[state=unchecked]:bg-muted"
                  onCheckedChange={(checked) => handleDataChange({ enableOther: checked })}
                />
                <Label htmlFor="other">Enable "Other" option</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="multiple"
                  checked={element.data.allowMultiple}
                  className="data-[state=unchecked]:bg-muted"
                  onCheckedChange={(checked) => handleDataChange({ allowMultiple: checked })}
                />
                <Label htmlFor="multiple">Allow multiple selection</Label>
              </div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

ContentEditorMultipleChoice.displayName = 'ContentEditorMultipleChoice';

export const ContentEditorMultipleChoiceSerialize = (props: {
  element: ContentEditorMultipleChoiceElement;
}) => {
  const { element } = props;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="space-y-2">
        {!element.data.allowMultiple ? (
          <RadioGroup defaultValue={element.data.options[0].value}>
            {element.data.options.map((option, index) => (
              <div className="flex items-center space-x-2" key={index}>
                <RadioGroupItem
                  value={option.value}
                  id={`r1${index}`}
                  className="border-sdk-question text-sdk-foreground"
                />
                <Label htmlFor={`r1${index}`} className="cursor-pointer">
                  {option.label || option.value}
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="flex flex-col gap-2">
            {element.data.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Checkbox
                  checked={option.checked}
                  className="border-sdk-question data-[state=checked]:bg-sdk-question data-[state=checked]:text-sdk-foreground"
                />
                <span>{option.label || option.value || `Option ${index + 1}`}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

ContentEditorMultipleChoiceSerialize.displayName = 'ContentEditorMultipleChoiceSerialize';
