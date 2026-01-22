// Main editable NPS component

import { memo, useCallback } from 'react';

import type { ContentEditorNPSElement } from '../../../types/editor';
import { BindAttribute } from '../../shared/bind-attribute';
import {
  QuestionEditorBase,
  QuestionNameField,
  ContentActionsField,
  LabelsField,
} from '../../shared';
import type { QuestionContextProps } from '../../shared';
import { NPSScale, NPSLabels } from './nps-display';

// Memoized Popover Content component
const NPSPopoverContent = memo(
  ({
    localData,
    handleDataChange,
    contextProps,
  }: {
    localData: ContentEditorNPSElement['data'];
    handleDataChange: (data: Partial<ContentEditorNPSElement['data']>) => void;
    contextProps: QuestionContextProps;
  }) => (
    <div className="flex flex-col gap-2.5">
      <QuestionNameField
        id="nps-question"
        value={localData.name || ''}
        onChange={(name) => handleDataChange({ name })}
      />

      <ContentActionsField
        actions={localData.actions}
        onActionsChange={(actions) => handleDataChange({ actions })}
        contextProps={contextProps}
      />

      <LabelsField
        lowLabel={localData.lowLabel}
        highLabel={localData.highLabel}
        onLowLabelChange={(lowLabel) => handleDataChange({ lowLabel })}
        onHighLabelChange={(highLabel) => handleDataChange({ highLabel })}
      />

      <BindAttribute
        bindToAttribute={localData.bindToAttribute || false}
        selectedAttribute={localData.selectedAttribute}
        zIndex={contextProps.zIndex}
        projectId={contextProps.projectId}
        onBindChange={(checked) => handleDataChange({ bindToAttribute: checked })}
        onAttributeChange={(value) => handleDataChange({ selectedAttribute: value })}
      />
    </div>
  ),
);

NPSPopoverContent.displayName = 'NPSPopoverContent';

export interface ContentEditorNPSProps {
  element: ContentEditorNPSElement;
  id: string;
  path: number[];
}

export const ContentEditorNPS = memo((props: ContentEditorNPSProps) => {
  const { element, id } = props;

  const renderDisplay = useCallback(
    (localData: ContentEditorNPSElement['data']) => (
      <div className="w-full">
        <NPSScale />
        <NPSLabels lowLabel={localData.lowLabel} highLabel={localData.highLabel} />
      </div>
    ),
    [],
  );

  const renderPopoverContent = useCallback(
    (contentProps: {
      localData: ContentEditorNPSElement['data'];
      handleDataChange: (data: Partial<ContentEditorNPSElement['data']>) => void;
      contextProps: QuestionContextProps;
    }) => <NPSPopoverContent {...contentProps} />,
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

ContentEditorNPS.displayName = 'ContentEditorNPS';
