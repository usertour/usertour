import * as Widget from '@usertour-packages/widget';
import { memo, useCallback, useMemo } from 'react';

import type { ContentEditorNPSElement } from '../../types/editor';
import { BindAttribute } from './bind-attribute';
import {
  QuestionEditorBase,
  QuestionNameField,
  ContentActionsField,
  LabelsField,
  useQuestionSerialize,
} from '../shared';
import type { QuestionContextProps } from '../shared';

// Constants
const NPS_SCALE_LENGTH = 11;
const DEFAULT_LOW_LABEL = 'Not at all likely';
const DEFAULT_HIGH_LABEL = 'Extremely likely';

const buttonBaseClass =
  'flex items-center overflow-hidden group relative border bg-sdk-question/10 text-sdk-question border-sdk-question hover:text-sdk-question hover:border-sdk-question hover:bg-sdk-question/40 rounded-md main-transition p-2 justify-center w-auto min-w-0';

// Memoized NPS Scale component for better performance
const NPSScale = memo(({ onClick }: { onClick?: (value: number) => void }) => {
  const scaleButtons = useMemo(
    () =>
      Array.from({ length: NPS_SCALE_LENGTH }, (_, i) => (
        <Widget.Button
          key={`nps-button-${i}`}
          variant="custom"
          className={buttonBaseClass}
          onClick={() => onClick?.(i)}
        >
          {i}
        </Widget.Button>
      )),
    [onClick],
  );

  return (
    <div
      className="grid gap-1.5 !gap-1"
      style={{ gridTemplateColumns: `repeat(${NPS_SCALE_LENGTH}, minmax(0px, 1fr))` }}
    >
      {scaleButtons}
    </div>
  );
});

NPSScale.displayName = 'NPSScale';

// Memoized Labels component
const NPSLabels = memo(({ lowLabel, highLabel }: { lowLabel?: string; highLabel?: string }) => (
  <div className="flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80">
    <p>{lowLabel || DEFAULT_LOW_LABEL}</p>
    <p>{highLabel || DEFAULT_HIGH_LABEL}</p>
  </div>
));

NPSLabels.displayName = 'NPSLabels';

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

export const ContentEditorNPS = (props: ContentEditorNPSProps) => {
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
};

ContentEditorNPS.displayName = 'ContentEditorNPS';

// Serialize Component
export type ContentEditorNPSSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorNPSElement;
  onClick?: (element: ContentEditorNPSElement, value: number) => Promise<void>;
};

export const ContentEditorNPSSerialize = memo((props: ContentEditorNPSSerializeType) => {
  const { element, onClick } = props;
  const { loading, handleClick } = useQuestionSerialize(element, onClick);

  return (
    <div className="w-full">
      <NPSScale onClick={loading ? undefined : handleClick} />
      <NPSLabels lowLabel={element.data.lowLabel} highLabel={element.data.highLabel} />
    </div>
  );
});

ContentEditorNPSSerialize.displayName = 'ContentEditorNPSSerialize';
