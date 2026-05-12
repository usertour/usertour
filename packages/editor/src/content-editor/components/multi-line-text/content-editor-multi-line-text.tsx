// Main editable multi-line text component

import * as Widget from '@usertour-packages/widget';
import { BizAttributeTypes } from '@usertour/types';
import { memo, useCallback } from 'react';

import type { ContentEditorMultiLineTextElement } from '../../../types/editor';
import { BindAttribute } from '../../shared/bind-attribute';
import { QuestionEditorBase } from '../../shared/question-editor-base';
import { QuestionNameField, ContentActionsField } from '../../shared/question-popover-fields';
import { TextInputPopoverFields } from '../../shared/text-input-popover-fields';
import { DEFAULT_PLACEHOLDER, DEFAULT_BUTTON_TEXT } from '../../shared/text-input-constants';
import type { QuestionContextProps } from '../../shared';

export interface ContentEditorMultiLineTextProps {
  element: ContentEditorMultiLineTextElement;
  id: string;
  path: number[];
}

export const ContentEditorMultiLineText = memo((props: ContentEditorMultiLineTextProps) => {
  const { element, id } = props;

  // Render the display component (trigger for popover)
  const renderDisplay = useCallback(
    (localData: ContentEditorMultiLineTextElement['data']) => (
      <div className="flex flex-col gap-2 items-center w-full">
        <Widget.Textarea
          placeholder={localData.placeholder || DEFAULT_PLACEHOLDER}
          disabled
          aria-label="Multi-line text input preview"
        />
        <div className="flex justify-end w-full">
          <Widget.Button>{localData.buttonText || DEFAULT_BUTTON_TEXT}</Widget.Button>
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
      localData: ContentEditorMultiLineTextElement['data'];
      handleDataChange: (data: Partial<ContentEditorMultiLineTextElement['data']>) => void;
      contextProps: QuestionContextProps;
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
});

ContentEditorMultiLineText.displayName = 'ContentEditorMultiLineText';
