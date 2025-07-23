import * as Popover from '@radix-ui/react-popover';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { cn } from '@usertour-packages/ui-utils';
import { useCallback, useEffect, useState, useMemo, memo } from 'react';
import { ContentActions } from '../..';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import { ContentEditorStarRatingElement } from '../../types/editor';
import { EditorErrorContent } from '../../components/editor-error';
import { EditorError } from '../../components/editor-error';
import { EditorErrorAnchor } from '../../components/editor-error';
import { isEmptyString } from '@usertour-packages/utils';
import { BindAttribute } from './bind-attribute';

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

interface StarRatingDisplayProps {
  scaleLength: number;
  hoveredIndex: number | null;
  onStarHover: (index: number) => void;
  onStarLeave: () => void;
  onStarClick?: (index: number) => void;
  lowRange: number;
  lowLabel?: string;
  highLabel?: string;
  isInteractive?: boolean;
}

const StarRatingDisplay = memo<StarRatingDisplayProps>(
  ({
    scaleLength,
    hoveredIndex,
    onStarHover,
    onStarLeave,
    onStarClick,
    lowRange,
    lowLabel,
    highLabel,
    isInteractive = true,
  }) => {
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
        if (!isInteractive || !onStarClick) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onStarClick(index);
        }
      },
      [isInteractive, onStarClick],
    );

    return (
      <div>
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
              onClick={isInteractive ? () => onStarClick?.(value) : undefined}
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
);

StarRatingDisplay.displayName = 'StarRatingDisplay';

interface ContentEditorStarRatingProps {
  element: ContentEditorStarRatingElement;
  id: string;
  path: number[];
}

export const ContentEditorStarRating = memo<ContentEditorStarRatingProps>((props) => {
  const { element, id } = props;
  const {
    updateElement,
    zIndex,
    currentStep,
    currentVersion,
    contentList,
    createStep,
    attributes,
    projectId,
  } = useContentEditorContext();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [openError, setOpenError] = useState<boolean>(false);
  const [localData, setLocalData] = useState(element.data);

  // Memoize computed values
  const scaleLength = useMemo(
    () => localData.highRange - localData.lowRange + 1,
    [localData.highRange, localData.lowRange],
  );

  const hasValidationError = useMemo(() => isEmptyString(localData.name), [localData.name]);

  const handleDataChange = useCallback((data: Partial<ContentEditorStarRatingElement['data']>) => {
    setLocalData((prevData) => ({ ...prevData, ...data }));
  }, []);

  const handleStarHover = useCallback((index: number) => {
    setHoveredIndex(index);
  }, []);

  const handleStarLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);

      if (open) {
        setOpenError(false);
        return;
      }

      if (hasValidationError) {
        setOpenError(true);
        return;
      }

      updateElement(
        {
          ...element,
          data: localData,
        },
        id,
      );
    },
    [hasValidationError, localData, element, id, updateElement],
  );

  // Update error state when validation changes
  useEffect(() => {
    setOpenError(hasValidationError && !isOpen);
  }, [hasValidationError, isOpen]);

  return (
    <EditorError open={openError}>
      <EditorErrorAnchor>
        <Popover.Root onOpenChange={handleOpenChange} open={isOpen}>
          <Popover.Trigger asChild>
            <div>
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
            </div>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-72 rounded-md border bg-background p-4 shadow-lg"
              style={{ zIndex }}
              sideOffset={10}
              side="right"
            >
              <div className="flex flex-col gap-2.5">
                <Label htmlFor="star-rating-question">Question name</Label>
                <Input
                  id="star-rating-question"
                  value={localData.name}
                  onChange={(e) => handleDataChange({ name: e.target.value })}
                  placeholder="Question name?"
                  aria-invalid={hasValidationError}
                  aria-describedby={hasValidationError ? 'question-error' : undefined}
                />
                {hasValidationError && (
                  <div id="question-error" className="text-sm text-red-500">
                    Question name is required
                  </div>
                )}

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

                <Label className="flex items-center gap-1">Scale range</Label>
                <div className="flex flex-row gap-2 items-center">
                  <Input
                    type="number"
                    value={localData.lowRange}
                    placeholder="Default"
                    disabled
                    onChange={(e) => handleDataChange({ lowRange: Number(e.target.value) })}
                  />
                  <p>-</p>
                  <Input
                    type="number"
                    value={localData.highRange}
                    placeholder="Default"
                    onChange={(e) => handleDataChange({ highRange: Number(e.target.value) })}
                    min={localData.lowRange + 1}
                    max={10}
                  />
                </div>

                <Label className="flex items-center gap-1">
                  Labels
                  <QuestionTooltip>
                    Below each option, provide labels to clearly convey their meaning, such as "Bad"
                    positioned under the left option and "Good" under the right.
                  </QuestionTooltip>
                </Label>
                <div className="flex flex-row gap-2">
                  <Input
                    type="text"
                    value={localData.lowLabel}
                    placeholder="Default"
                    onChange={(e) => handleDataChange({ lowLabel: e.target.value })}
                  />
                  <Input
                    type="text"
                    value={localData.highLabel}
                    placeholder="Default"
                    onChange={(e) => handleDataChange({ highLabel: e.target.value })}
                  />
                </div>

                <BindAttribute
                  zIndex={zIndex}
                  projectId={projectId}
                  bindToAttribute={localData.bindToAttribute || false}
                  selectedAttribute={localData.selectedAttribute}
                  onBindChange={(checked) => handleDataChange({ bindToAttribute: checked })}
                  onAttributeChange={(value) => handleDataChange({ selectedAttribute: value })}
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
});

ContentEditorStarRating.displayName = 'ContentEditorStarRating';

interface ContentEditorStarRatingSerializeProps {
  element: ContentEditorStarRatingElement;
  onClick?: (element: ContentEditorStarRatingElement, value: number) => Promise<void>;
}

export const ContentEditorStarRatingSerialize = memo<ContentEditorStarRatingSerializeProps>(
  (props) => {
    const { element, onClick } = props;
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

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

    const handleStarClick = useCallback(
      async (value: number) => {
        if (onClick) {
          setLoading(true);
          try {
            await onClick(element, value);
          } finally {
            setLoading(false);
          }
        }
      },
      [onClick, element],
    );

    return (
      <StarRatingDisplay
        scaleLength={scaleLength}
        hoveredIndex={hoveredIndex}
        onStarHover={handleStarHover}
        onStarLeave={handleStarLeave}
        onStarClick={loading ? undefined : handleStarClick}
        lowRange={element.data.lowRange}
        lowLabel={element.data.lowLabel}
        highLabel={element.data.highLabel}
        isInteractive={true}
      />
    );
  },
);

ContentEditorStarRatingSerialize.displayName = 'ContentEditorStarRatingSerialize';
