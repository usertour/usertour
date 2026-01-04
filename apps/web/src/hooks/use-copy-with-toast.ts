import { useCopyToClipboard } from 'react-use';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';

/**
 * Custom hook that combines copy to clipboard functionality with toast notification
 * @returns A function that copies text to clipboard and shows a toast notification
 */
export function useCopyWithToast() {
  const [_, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();

  const copyWithToast = useCallback(
    (text: string, customMessage?: string) => {
      // Handle empty string case - silently return without showing toast
      // Empty string copy is technically valid but not useful
      if (!text) {
        return;
      }

      copyToClipboard(text);

      // Show success message
      // For long text, use a shorter message to avoid UI overflow
      const message =
        customMessage ??
        (text.length > 50 ? 'Text copied to clipboard' : `"${text}" copied to clipboard`);
      toast({
        variant: 'success',
        title: message,
      });
    },
    [copyToClipboard, toast],
  );

  return copyWithToast;
}
