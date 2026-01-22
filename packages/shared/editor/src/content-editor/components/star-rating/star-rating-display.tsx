// Star rating display component for preview and serialize

import { cn } from '@usertour-packages/tailwind';
import { forwardRef, memo, useCallback, useMemo } from 'react';

import { STAR_SVG_PATH, QUESTION_LABELS_CONTAINER_CLASS } from '../../constants';

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
      <path d={STAR_SVG_PATH} />
    </svg>
  ),
);

StarButton.displayName = 'StarButton';

export interface StarRatingDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
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
export const StarRatingDisplay = memo(
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
            <div className={QUESTION_LABELS_CONTAINER_CLASS}>
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
