import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-packages/button';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { Switch } from '@usertour-packages/switch';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ContentActions } from '../..';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import { ContentEditorSingleLineTextElement } from '../../types/editor';
import { EditorError, EditorErrorAnchor, EditorErrorContent } from '../../components/editor-error';
import { isEmptyString } from '@usertour-packages/utils';
import { BindAttribute } from './bind-attribute';
import { BizAttributeTypes } from '@usertour/types';

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
    projectId,
  } = useContentEditorContext();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [openError, setOpenError] = useState<boolean>(false);
  const [localData, setLocalData] = useState(element.data);

  // Memoize validation state to avoid unnecessary re-renders
  const isNameEmpty = useMemo(() => isEmptyString(localData.name), [localData.name]);
  const shouldShowError = useMemo(() => isNameEmpty && !isOpen, [isNameEmpty, isOpen]);

  const handleDataChange = useCallback(
    (data: Partial<ContentEditorSingleLineTextElement['data']>) => {
      setLocalData((prevData) => ({ ...prevData, ...data }));
    },
    [],
  );

  // Optimize error state updates
  useEffect(() => {
    setOpenError(shouldShowError);
  }, [shouldShowError]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);

      if (open) {
        setOpenError(false);
        return;
      }

      if (isNameEmpty) {
        setOpenError(true);
        return;
      }

      // Only update if data has actually changed
      if (JSON.stringify(localData) !== JSON.stringify(element.data)) {
        updateElement(
          {
            ...element,
            data: localData,
          },
          id,
        );
      }
    },
    [isNameEmpty, localData, element, id, updateElement],
  );

  // Memoize input handlers to prevent unnecessary re-renders
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleDataChange({ name: e.target.value });
    },
    [handleDataChange],
  );

  const handlePlaceholderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleDataChange({ placeholder: e.target.value });
    },
    [handleDataChange],
  );

  const handleButtonTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleDataChange({ buttonText: e.target.value });
    },
    [handleDataChange],
  );

  const handleRequiredChange = useCallback(
    (checked: boolean) => {
      handleDataChange({ required: checked });
    },
    [handleDataChange],
  );

  const handleBindChange = useCallback(
    (checked: boolean) => {
      handleDataChange({ bindToAttribute: checked });
    },
    [handleDataChange],
  );

  const handleAttributeChange = useCallback(
    (value: any) => {
      handleDataChange({ selectedAttribute: value });
    },
    [handleDataChange],
  );

  const handleActionsChange = useCallback(
    (actions: any) => {
      handleDataChange({ actions });
    },
    [handleDataChange],
  );

  // Memoize default values to prevent unnecessary re-renders
  const defaultValues = useMemo(
    () => ({
      placeholder: localData.placeholder || 'Enter text...',
      buttonText: localData.buttonText || 'Submit',
    }),
    [localData.placeholder, localData.buttonText],
  );

  return (
    <EditorError open={openError}>
      <EditorErrorAnchor className="w-full">
        <Popover.Root onOpenChange={handleOpenChange} open={isOpen}>
          <Popover.Trigger asChild>
            <div className="flex flex-col gap-2 items-center w-full">
              <Input
                placeholder={defaultValues.placeholder}
                className="grow h-auto border-sdk-question bg-sdk-background"
                aria-label="Text input field"
                readOnly
              />
              <div className="flex justify-end w-full">
                <Button forSdk={true} size="sm" className="flex-none">
                  {defaultValues.buttonText}
                </Button>
              </div>
            </div>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-72 rounded-md border bg-background p-4 shadow-lg"
              style={{ zIndex }}
              sideOffset={10}
              side="right"
              aria-label="Single line text configuration"
            >
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="question-name">Question name</Label>
                  <Input
                    id="question-name"
                    value={localData.name}
                    onChange={handleNameChange}
                    placeholder="Enter question name"
                    aria-describedby={isNameEmpty ? 'name-error' : undefined}
                    aria-invalid={isNameEmpty}
                  />
                  {isNameEmpty && (
                    <div id="name-error" className="text-sm text-red-500">
                      Question name is required
                    </div>
                  )}
                </div>

                <Label>When answer is submitted</Label>
                <ContentActions
                  zIndex={zIndex}
                  isShowIf={false}
                  isShowLogic={false}
                  currentStep={currentStep}
                  currentVersion={currentVersion}
                  onDataChange={handleActionsChange}
                  defaultConditions={localData.actions || []}
                  attributes={attributes}
                  contents={contentList}
                  createStep={createStep}
                />

                <div className="space-y-2">
                  <Label htmlFor="placeholder">Placeholder text</Label>
                  <Input
                    id="placeholder"
                    value={localData.placeholder}
                    onChange={handlePlaceholderChange}
                    placeholder="Enter placeholder text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="button-text">Submit button text</Label>
                  <Input
                    id="button-text"
                    value={localData.buttonText}
                    onChange={handleButtonTextChange}
                    placeholder="Enter button text"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="required">Required</Label>
                  <Switch
                    id="required"
                    className="data-[state=unchecked]:bg-muted"
                    checked={localData.required}
                    onCheckedChange={handleRequiredChange}
                  />
                </div>

                <BindAttribute
                  zIndex={zIndex}
                  bindToAttribute={localData.bindToAttribute || false}
                  projectId={projectId}
                  selectedAttribute={localData.selectedAttribute}
                  onBindChange={handleBindChange}
                  onAttributeChange={handleAttributeChange}
                  dataType={BizAttributeTypes.String}
                />
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
  onClick?: (element: ContentEditorSingleLineTextElement, value: string) => Promise<void> | void;
}) => {
  const { element, onClick } = props;
  const [value, setValue] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Memoize computed values
  const isDisabled = useMemo(
    () => loading || (element.data.required && isEmptyString(value)),
    [loading, element.data.required, value],
  );

  const defaultValues = useMemo(
    () => ({
      placeholder: element.data.placeholder || 'Enter text...',
      buttonText: element.data.buttonText || 'Submit',
    }),
    [element.data.placeholder, element.data.buttonText],
  );

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (onClick) {
      setLoading(true);
      try {
        await onClick(element, value);
      } finally {
        setLoading(false);
      }
    }
  }, [onClick, element, value]);

  return (
    <div className="flex flex-col gap-2 items-center w-full">
      <Input
        placeholder={defaultValues.placeholder}
        className="grow h-auto border-sdk-question bg-sdk-background"
        value={value}
        onChange={handleValueChange}
        aria-label="Text input field"
      />
      <div className="flex justify-end w-full">
        <Button
          forSdk={true}
          className="flex-none"
          onClick={handleSubmit}
          disabled={isDisabled}
          aria-label={`Submit ${defaultValues.buttonText}`}
        >
          {defaultValues.buttonText}
        </Button>
      </div>
    </div>
  );
};

ContentEditorSingleLineTextSerialize.displayName = 'ContentEditorSingleLineTextSerialize';
