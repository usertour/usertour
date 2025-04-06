import { cn } from '@/utils/common';
import { StarButton } from '@usertour-ui/shared-editor';

interface QuestionStarRatingProps {
  maxLength: number;
  score: number;
}

export const QuestionStarRating = ({ maxLength, score }: QuestionStarRatingProps) => {
  return Array.from({ length: maxLength }, (_, i) => (
    <StarButton
      key={i}
      className={cn('text-blue-100 w-3 h-3', {
        'text-blue-700': score !== null && i <= score - 1,
      })}
    />
  ));
};
QuestionStarRating.displayName = 'QuestionStarRating';
