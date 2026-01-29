import { useState, useEffect, useCallback, useMemo } from 'react';

interface UseAvatarUrlProps {
  avatarUrl?: string;
  isCurrentUrl: boolean;
  onUrlSubmit: (url: string) => void;
}

/**
 * Validate URL string
 */
const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Hook for handling avatar URL input
 */
export const useAvatarUrl = ({ avatarUrl, isCurrentUrl, onUrlSubmit }: UseAvatarUrlProps) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [showError, setShowError] = useState(false);

  // Initialize URL input when source is URL
  useEffect(() => {
    if (isCurrentUrl) {
      setUrlInput(avatarUrl ?? '');
    } else {
      setUrlInput('');
    }
    // Reset error state when switching source
    setShowError(false);
  }, [isCurrentUrl, avatarUrl]);

  // Compute validation error
  const validationError = useMemo(() => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      return undefined;
    }
    if (!validateUrl(trimmedUrl)) {
      return 'Please enter a valid URL';
    }
    return undefined;
  }, [urlInput]);

  // Hide error when user focuses to edit
  const handleFocus = useCallback(() => {
    setShowError(false);
  }, []);

  // Show error when user leaves the field
  const handleBlur = useCallback(() => {
    setShowError(true);
  }, []);

  // Auto-submit when URL is valid
  useEffect(() => {
    const trimmedUrl = urlInput.trim();
    if (trimmedUrl && validateUrl(trimmedUrl)) {
      onUrlSubmit(trimmedUrl);
    }
  }, [urlInput, onUrlSubmit]);

  return {
    urlInput,
    setUrlInput,
    handleFocus,
    handleBlur,
    // Only show error when field is not focused
    error: showError ? validationError : undefined,
  };
};
