import * as Widget from '@usertour-packages/widget';
import { BizAttributeTypes } from '@usertour/types';
import { useCallback } from 'react';

import { QuestionEditorBase } from '../shared/question-editor-base';
import { QuestionNameField, ContentActionsField } from '../shared/question-popover-fields';
import { TextInputPopoverFields } from '../shared/text-input-popover-fields';
import {
  TextInputSerialize,
  DEFAULT_PLACEHOLDER,
  DEFAULT_BUTTON_TEXT,
} from '../shared/text-input-serialize';
import { ContentEditorSingleLineTextElement } from '../../types/editor';
import { BindAttribute } from './bind-attribute';

interface ContentEditorSingleLineTextProps {
  element: ContentEditorSingleLineTextElement;
  id: string;
  path: number[];
}

export const ContentEditorSingleLineText = (props: ContentEditorSingleLineTextProps) => {
  const { element, id } = props;

  // Render the display component (trigger for popover)
  const renderDisplay = useCallback(
    (localData: ContentEditorSingleLineTextElement['data']) => (
      <div className="flex flex-col gap-2 items-center w-full">
        <Widget.Input
          placeholder={localData.placeholder || DEFAULT_PLACEHOLDER}
          className="grow h-auto"
          aria-label="Single-line text input preview"
          readOnly
        />
        <div className="flex justify-end w-full">
          <Widget.Button className="flex-none">
            {localData.buttonText || DEFAULT_BUTTON_TEXT}
          </Widget.Button>
        </div>
      </div>
    ),
    [],
  );

  // Render the popover content
  const renderPopoverContent = useCallback(
    ({
      localData,
      handleDataChange,
      contextProps,
    }: {
      localData: ContentEditorSingleLineTextElement['data'];
      handleDataChange: (data: Partial<ContentEditorSingleLineTextElement['data']>) => void;
      contextProps: any;
    }) => (
      <div className="flex flex-col gap-4">
        <QuestionNameField
          value={localData.name || ''}
          onChange={(name) => handleDataChange({ name })}
        />
        <ContentActionsField
          actions={localData.actions}
          onActionsChange={(actions) => handleDataChange({ actions })}
          contextProps={contextProps}
        />
        <TextInputPopoverFields
          placeholder={localData.placeholder || ''}
          buttonText={localData.buttonText || ''}
          required={localData.required || false}
          onPlaceholderChange={(placeholder) => handleDataChange({ placeholder })}
          onButtonTextChange={(buttonText) => handleDataChange({ buttonText })}
          onRequiredChange={(required) => handleDataChange({ required })}
        />
        <BindAttribute
          bindToAttribute={localData.bindToAttribute || false}
          selectedAttribute={localData.selectedAttribute}
          zIndex={contextProps.zIndex}
          projectId={contextProps.projectId}
          onBindChange={(checked) => handleDataChange({ bindToAttribute: checked })}
          onAttributeChange={(value) => handleDataChange({ selectedAttribute: value })}
          dataType={BizAttributeTypes.String}
        />
      </div>
    ),
    [],
  );

  return (
    <QuestionEditorBase
      element={element}
      id={id}
      renderDisplay={renderDisplay}
      renderPopoverContent={renderPopoverContent}
    />
  );
};

ContentEditorSingleLineText.displayName = 'ContentEditorSingleLineText';

// Serialize component using the shared TextInputSerialize
export const ContentEditorSingleLineTextSerialize = (props: {
  element: ContentEditorSingleLineTextElement;
  onClick?: (element: ContentEditorSingleLineTextElement, value: string) => Promise<void> | void;
}) => {
  const { element, onClick } = props;

  return (
    <TextInputSerialize
      element={element}
      onClick={onClick}
      inputType="input"
      inputClassName="grow h-auto"
    />
  );
};

ContentEditorSingleLineTextSerialize.displayName = 'ContentEditorSingleLineTextSerialize';
