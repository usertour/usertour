// Shared hook for question serialize components with loading state

import { useCallback, useState } from 'react';

/**
 * Custom hook to handle serialize component click with loading state
 * @param element - The element data
 * @param onClick - Optional async click handler
 * @returns loading state and handleClick function
 */
export function useQuestionSerialize<T, V>(
  element: T,
  onClick?: (element: T, value: V) => Promise<void>,
): {
  loading: boolean;
  handleClick: (value: V) => Promise<void>;
} {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(
    async (value: V) => {
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

  return { loading, handleClick };
}
