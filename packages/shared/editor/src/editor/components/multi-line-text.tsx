import * as Popover from '@radix-ui/react-popover';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { Switch } from '@usertour-packages/switch';
import * as Widget from '@usertour-packages/widget';
import { useCallback, useEffect, useState } from 'react';
import { ContentActions } from '../..';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import { ContentEditorMultiLineTextElement } from '../../types/editor';
import { EditorErrorContent } from '../../components/editor-error';
import { EditorError } from '../../components/editor-error';
import { EditorErrorAnchor } from '../../components/editor-error';
import { isEmptyString } from '@usertour/helpers';
import { BindAttribute } from './bind-attribute';
import { BizAttributeTypes } from '@usertour/types';

// Constants
const DEFAULT_PLACEHOLDER = 'Enter text...';
const DEFAULT_BUTTON_TEXT = 'Submit';

interface ContentEditorMultiLineTextProps {
  element: ContentEditorMultiLineTextElement;
  id: string;
  path: number[];
}

export const ContentEditorMultiLineText = (props: ContentEditorMultiLineTextProps) => {
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

  const handleDataChange = useCallback(
    (data: Partial<ContentEditorMultiLineTextElement['data']>) => {
      setLocalData((prevData) => ({ ...prevData, ...data }));
    },
    [],
  );

  useEffect(() => {
    setOpenError(isEmptyString(localData.name) && !isOpen);
  }, [localData.name, isOpen]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        setOpenError(false);
        return;
      }
      if (isEmptyString(localData.name)) {
        setOpenError(true);
        return;
      }

      // Only update if data has changed
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
    [localData, element, id, updateElement],
  );

  return (
    <EditorError open={openError}>
      <EditorErrorAnchor className="w-full">
        <Popover.Root onOpenChange={handleOpenChange} open={isOpen}>
          <Popover.Trigger asChild>
            <div className="flex flex-col gap-2 items-center w-full">
              <Widget.Textarea
                placeholder={localData.placeholder || DEFAULT_PLACEHOLDER}
                disabled
              />
              <div className="flex justify-end w-full">
                <Widget.Button>{localData.buttonText || DEFAULT_BUTTON_TEXT}</Widget.Button>
              </div>
            </div>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-72 rounded-md border bg-background p-4 shadow-lg"
              style={{ zIndex }}
              sideOffset={10}
              side="right"
            >
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
                  <Label htmlFor="placeholder">Placeholder</Label>
                  <Input
                    id="placeholder"
                    value={localData.placeholder || ''}
                    onChange={(e) => handleDataChange({ placeholder: e.target.value })}
                    placeholder="Enter placeholder text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="button-text">Button text</Label>
                  <Input
                    id="button-text"
                    value={localData.buttonText || ''}
                    onChange={(e) => handleDataChange({ buttonText: e.target.value })}
                    placeholder="Enter button text"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="required"
                    checked={localData.required || false}
                    onCheckedChange={(checked) => handleDataChange({ required: checked })}
                  />
                  <Label htmlFor="required">Required</Label>
                </div>
                <BindAttribute
                  bindToAttribute={localData.bindToAttribute || false}
                  selectedAttribute={localData.selectedAttribute}
                  zIndex={zIndex}
                  projectId={projectId}
                  onBindChange={(checked) => handleDataChange({ bindToAttribute: checked })}
                  onAttributeChange={(value) => handleDataChange({ selectedAttribute: value })}
                  dataType={BizAttributeTypes.String}
                />
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </EditorErrorAnchor>
      <EditorErrorContent side="bottom" style={{ zIndex }}>
        Question name is required
      </EditorErrorContent>
    </EditorError>
  );
};

ContentEditorMultiLineText.displayName = 'ContentEditorMultiLineText';

export const ContentEditorMultiLineTextSerialize = (props: {
  element: ContentEditorMultiLineTextElement;
  onClick?: (element: ContentEditorMultiLineTextElement, value: string) => Promise<void> | void;
}) => {
  const { element, onClick } = props;
  const [value, setValue] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (onClick) {
      setLoading(true);
      try {
        await onClick(element, value);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 items-center w-full">
      <Widget.Textarea
        placeholder={element.data.placeholder || DEFAULT_PLACEHOLDER}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex justify-end w-full">
        <Widget.Button
          onClick={handleClick}
          disabled={loading || (element.data.required && isEmptyString(value))}
        >
          {element.data.buttonText || DEFAULT_BUTTON_TEXT}
        </Widget.Button>
      </div>
    </div>
  );
};

ContentEditorMultiLineTextSerialize.displayName = 'ContentEditorMultiLineTextSerialize';
