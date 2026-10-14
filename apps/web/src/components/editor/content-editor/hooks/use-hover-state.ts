// Custom hook for handling hover state events

import { useCallback } from 'react';

export interface UseHoverStateOptions {
  setIsHover: (value: boolean) => void;
}

export interface UseHoverStateReturn {
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  handleFocus: () => void;
  handleBlur: () => void;
}

export const useHoverState = ({ setIsHover }: UseHoverStateOptions): UseHoverStateReturn => {
  const handleMouseEnter = useCallback(() => {
    setIsHover(true);
  }, [setIsHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHover(false);
  }, [setIsHover]);

  const handleFocus = useCallback(() => {
    setIsHover(true);
  }, [setIsHover]);

  const handleBlur = useCallback(() => {
    setIsHover(false);
  }, [setIsHover]);

  return {
    handleMouseEnter,
    handleMouseLeave,
    handleFocus,
    handleBlur,
  };
};
