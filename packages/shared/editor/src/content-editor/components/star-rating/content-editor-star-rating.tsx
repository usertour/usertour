// Main editable star rating component

import { memo, useCallback, useState } from 'react';

import type { ContentEditorStarRatingElement } from '../../../types/editor';
import { BindAttribute } from '../../shared/bind-attribute';
import {
  QuestionEditorBase,
  QuestionNameField,
  ContentActionsField,
  LabelsField,
  ScaleRangeField,
} from '../../shared';
import type { QuestionContextProps } from '../../shared';
import { StarRatingDisplay } from './star-rating-display';

// Memoized Popover Content component
const StarRatingPopoverContent = memo(
  ({
    localData,
    handleDataChange,
    contextProps,
  }: {
    localData: ContentEditorStarRatingElement['data'];
    handleDataChange: (data: Partial<ContentEditorStarRatingElement['data']>) => void;
    contextProps: QuestionContextProps;
  }) => (
    <div className="flex flex-col gap-2.5">
      <QuestionNameField
        id="star-rating-question"
        value={localData.name}
        onChange={(name) => handleDataChange({ name })}
      />

      <ContentActionsField
        actions={localData.actions}
        onActionsChange={(actions) => handleDataChange({ actions })}
        contextProps={contextProps}
      />

      <ScaleRangeField
        lowRange={localData.lowRange}
        highRange={localData.highRange}
        onLowRangeChange={(lowRange) => handleDataChange({ lowRange })}
        onHighRangeChange={(highRange) => handleDataChange({ highRange })}
        minValue={1}
        maxValue={10}
        lowDisabled={true}
        lowPlaceholder="Default"
        highPlaceholder="Default"
        highMinFollowsLow={true}
      />

      <LabelsField
        lowLabel={localData.lowLabel}
        highLabel={localData.highLabel}
        onLowLabelChange={(lowLabel) => handleDataChange({ lowLabel })}
        onHighLabelChange={(highLabel) => handleDataChange({ highLabel })}
      />

      <BindAttribute
        zIndex={contextProps.zIndex}
        projectId={contextProps.projectId}
        bindToAttribute={localData.bindToAttribute || false}
        selectedAttribute={localData.selectedAttribute}
        onBindChange={(checked) => handleDataChange({ bindToAttribute: checked })}
        onAttributeChange={(value) => handleDataChange({ selectedAttribute: value })}
      />
    </div>
  ),
);

StarRatingPopoverContent.displayName = 'StarRatingPopoverContent';

export interface ContentEditorStarRatingProps {
  element: ContentEditorStarRatingElement;
  id: string;
  path: number[];
}

export const ContentEditorStarRating = memo<ContentEditorStarRatingProps>((props) => {
  const { element, id } = props;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleStarHover = useCallback((index: number) => {
    setHoveredIndex(index);
  }, []);

  const handleStarLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  const renderDisplay = useCallback(
    (localData: ContentEditorStarRatingElement['data']) => {
      const scaleLength = localData.highRange - localData.lowRange + 1;
      return (
        <StarRatingDisplay
          scaleLength={scaleLength}
          hoveredIndex={hoveredIndex}
          onStarHover={handleStarHover}
          onStarLeave={handleStarLeave}
          lowRange={localData.lowRange}
          lowLabel={localData.lowLabel}
          highLabel={localData.highLabel}
          isInteractive={false}
        />
      );
    },
    [hoveredIndex, handleStarHover, handleStarLeave],
  );

  const renderPopoverContent = useCallback(
    (contentProps: {
      localData: ContentEditorStarRatingElement['data'];
      handleDataChange: (data: Partial<ContentEditorStarRatingElement['data']>) => void;
      contextProps: QuestionContextProps;
    }) => <StarRatingPopoverContent {...contentProps} />,
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

ContentEditorStarRating.displayName = 'ContentEditorStarRating';
