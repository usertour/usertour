import { useCallback, useState, useEffect } from 'react';

import { useToast } from '@usertour-packages/use-toast';

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
  const { toast } = useToast();

  // Initialize URL input when source is URL
  useEffect(() => {
    if (isCurrentUrl) {
      setUrlInput(avatarUrl ?? '');
    } else {
      setUrlInput('');
    }
  }, [isCurrentUrl, avatarUrl]);

  const handleUrlSubmit = useCallback(() => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      toast({ variant: 'destructive', title: 'Please enter a valid URL' });
      return;
    }

    if (!validateUrl(trimmedUrl)) {
      toast({ variant: 'destructive', title: 'Please enter a valid URL' });
      return;
    }

    onUrlSubmit(trimmedUrl);
  }, [urlInput, onUrlSubmit, toast]);

  return {
    urlInput,
    setUrlInput,
    handleUrlSubmit,
    isValid: urlInput.trim().length > 0 && validateUrl(urlInput.trim()),
  };
};
