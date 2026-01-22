import { cn } from '@usertour-packages/tailwind';
import { forwardRef, memo, useCallback, useMemo, useState } from 'react';

import type { ContentEditorStarRatingElement } from '../../types/editor';
import { BindAttribute } from './bind-attribute';
import {
  QuestionEditorBase,
  QuestionNameField,
  ContentActionsField,
  LabelsField,
  ScaleRangeField,
  useQuestionSerialize,
} from '../shared';
import type { QuestionContextProps } from '../shared';

// Star SVG path constant to avoid recreation
const STAR_PATH =
  'M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z';

interface StarButtonProps {
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<Element>) => void;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
}

export const StarButton = memo<StarButtonProps>(
  ({
    className,
    onMouseEnter,
    onMouseLeave,
    onClick,
    onKeyDown,
    'aria-label': ariaLabel,
    'aria-pressed': ariaPressed,
  }) => (
    <svg
      className={cn('w-8 h-8 cursor-pointer transition-colors duration-150', className)}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 22 20"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      tabIndex={onClick ? 0 : undefined}
    >
      <path d={STAR_PATH} />
    </svg>
  ),
);

StarButton.displayName = 'StarButton';

interface StarRatingDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  scaleLength: number;
  hoveredIndex: number | null;
  onStarHover: (index: number) => void;
  onStarLeave: () => void;
  onValueChange?: (value: number) => void;
  lowRange: number;
  lowLabel?: string;
  highLabel?: string;
  isInteractive?: boolean;
}

// Memoized Star Rating Display Component with forwardRef for Radix compatibility
const StarRatingDisplay = memo(
  forwardRef<HTMLDivElement, StarRatingDisplayProps>(
    (
      {
        scaleLength,
        hoveredIndex,
        onStarHover,
        onStarLeave,
        onValueChange,
        lowRange,
        lowLabel,
        highLabel,
        isInteractive = true,
        ...props
      },
      ref,
    ) => {
      const stars = useMemo(
        () =>
          Array.from({ length: scaleLength }, (_, i) => ({
            index: i,
            value: lowRange + i,
            isHighlighted: hoveredIndex !== null && i <= hoveredIndex,
          })),
        [scaleLength, lowRange, hoveredIndex],
      );

      const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<Element>, index: number) => {
          if (!isInteractive || !onValueChange) return;

          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onValueChange(index);
          }
        },
        [isInteractive, onValueChange],
      );

      return (
        <div ref={ref} {...props}>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${scaleLength}, minmax(0px, 1fr))` }}
            data-relin-paragraph="655"
            onMouseLeave={onStarLeave}
            role="radiogroup"
            aria-label="Star rating"
          >
            {stars.map(({ index, value, isHighlighted }) => (
              <StarButton
                key={index}
                className={cn('text-sdk-question/30', {
                  'text-sdk-question': isHighlighted,
                })}
                onMouseEnter={() => onStarHover(index)}
                onClick={isInteractive ? () => onValueChange?.(value) : undefined}
                onKeyDown={(e) => handleKeyDown(e, value)}
                aria-label={`${value} star${value !== 1 ? 's' : ''}`}
                aria-pressed={isHighlighted}
              />
            ))}
          </div>
          {(lowLabel || highLabel) && (
            <div className="flex mt-2.5 px-0.5 text-[13px] items-center justify-between opacity-80">
              <p>{lowLabel}</p>
              <p>{highLabel}</p>
            </div>
          )}
        </div>
      );
    },
  ),
);

StarRatingDisplay.displayName = 'StarRatingDisplay';

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

export interface ContentEditorStarRatingSerializeProps {
  element: ContentEditorStarRatingElement;
  onClick?: (element: ContentEditorStarRatingElement, value: number) => Promise<void>;
}

export const ContentEditorStarRatingSerialize = memo<ContentEditorStarRatingSerializeProps>(
  (props) => {
    const { element, onClick } = props;
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const { loading, handleClick } = useQuestionSerialize(element, onClick);

    const scaleLength = useMemo(
      () => element.data.highRange - element.data.lowRange + 1,
      [element.data.highRange, element.data.lowRange],
    );

    const handleStarHover = useCallback((index: number) => {
      setHoveredIndex(index);
    }, []);

    const handleStarLeave = useCallback(() => {
      setHoveredIndex(null);
    }, []);

    return (
      <StarRatingDisplay
        scaleLength={scaleLength}
        hoveredIndex={hoveredIndex}
        onStarHover={handleStarHover}
        onStarLeave={handleStarLeave}
        onValueChange={loading ? undefined : handleClick}
        lowRange={element.data.lowRange}
        lowLabel={element.data.lowLabel}
        highLabel={element.data.highLabel}
        isInteractive={true}
      />
    );
  },
);

ContentEditorStarRatingSerialize.displayName = 'ContentEditorStarRatingSerialize';
