import { useCallback, useState, useEffect } from 'react';
import { useToast } from '@usertour-packages/use-toast';
import { LauncherIconSource } from '@usertour/types';
import { validateUrl } from '../utils';

interface UseIconUrlProps {
  iconUrl?: string;
  iconSource: LauncherIconSource;
  onUrlSubmit: (url: string) => void;
}

export const useIconUrl = ({ iconUrl, iconSource, onUrlSubmit }: UseIconUrlProps) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const { toast } = useToast();

  // Initialize URL input when icon source is URL
  useEffect(() => {
    if (iconSource === LauncherIconSource.URL) {
      setUrlInput(iconUrl ?? '');
    } else {
      setUrlInput('');
    }
  }, [iconSource, iconUrl]);

  const handleUrlSubmit = useCallback(() => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      toast({ variant: 'destructive', title: 'Please enter a valid URL' });
      return;
    }

    // Basic URL validation
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
