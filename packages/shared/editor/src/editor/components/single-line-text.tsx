import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-ui/button';
import { Input } from '@usertour-ui/input';
import { Label } from '@usertour-ui/label';
import { Switch } from '@usertour-ui/switch';
import { RulesCondition } from '@usertour-ui/types';
import { useCallback, useEffect, useState } from 'react';
import { ContentActions } from '../..';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import { ContentEditorSingleLineTextElement } from '../../types/editor';
import { EditorError, EditorErrorAnchor, EditorErrorContent } from '../../components/editor-error';
import { isEmptyString } from '@usertour-ui/shared-utils';

interface ContentEditorSingleLineTextProps {
  element: ContentEditorSingleLineTextElement;
  id: string;
  path: number[];
}

export const ContentEditorSingleLineText = (props: ContentEditorSingleLineTextProps) => {
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
  const [isShowError, setIsShowError] = useState<boolean>(false);

  const handleDataChange = useCallback(
    (updates: Partial<typeof element.data>) => {
      updateElement(
        {
          ...element,
          data: { ...element.data, ...updates },
        },
        id,
      );
    },
    [element, id, updateElement],
  );

  const handleActionChange = (actions: RulesCondition[]) => {
    handleDataChange({ actions });
  };

  useEffect(() => {
    setIsShowError(isEmptyString(element.data.name));
  }, [element?.data?.name]);

  return (
    <EditorError open={isShowError}>
      <EditorErrorAnchor className="w-full">
        <Popover.Root modal={true} onOpenChange={setIsOpen} open={isOpen}>
          <Popover.Trigger asChild>
            <div className="flex flex-col gap-2 items-center w-full">
              <Input
                placeholder={element.data.placeholder || 'Enter text...'}
                className="grow h-auto"
              />
              <div className="flex justify-end w-full">
                <Button forSdk={true} size="sm" className="flex-none">
                  {element.data.buttonText || 'Submit'}
                </Button>
              </div>
            </div>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-72 rounded-md border bg-background p-4"
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
                  <Label htmlFor="placeholder">Placeholder text</Label>
                  <Input
                    id="placeholder"
                    value={element.data.placeholder}
                    onChange={(e) => handleDataChange({ placeholder: e.target.value })}
                    placeholder="Enter placeholder text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="button-text">Submit button text</Label>
                  <Input
                    id="button-text"
                    value={element.data.buttonText}
                    onChange={(e) => handleDataChange({ buttonText: e.target.value })}
                    placeholder="Enter button text"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="required">Required</Label>
                  <Switch
                    id="required"
                    className="data-[state=unchecked]:bg-muted"
                    checked={element.data.required}
                    onCheckedChange={(checked) => handleDataChange({ required: checked })}
                  />
                </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </EditorErrorAnchor>
      <EditorErrorContent side="bottom" style={{ zIndex: zIndex }}>
        Question name is required
      </EditorErrorContent>
    </EditorError>
  );
};

ContentEditorSingleLineText.displayName = 'ContentEditorSingleLineText';

export const ContentEditorSingleLineTextSerialize = (props: {
  element: ContentEditorSingleLineTextElement;
  onClick?: (element: ContentEditorSingleLineTextElement, value: string) => void;
}) => {
  const { element, onClick } = props;
  const [value, setValue] = useState<string>('');

  return (
    <div className="flex flex-col gap-2 items-center w-full">
      <Input
        placeholder={element.data.placeholder || 'Enter text...'}
        className="grow h-auto border-sdk-question bg-sdk-background"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex justify-end w-full">
        <Button
          forSdk={true}
          className="flex-none"
          onClick={() => onClick?.(element, value)}
          disabled={element.data.required && isEmptyString(value)}
        >
          {element.data.buttonText || 'Submit'}
        </Button>
      </div>
    </div>
  );
};

ContentEditorSingleLineTextSerialize.displayName = 'ContentEditorSingleLineTextSerialize';
