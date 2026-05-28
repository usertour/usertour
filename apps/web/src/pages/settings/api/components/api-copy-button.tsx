import { Button, useToast } from '@usertour/ui';
import { CopyIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';

interface ApiCopyButtonProps {
  token: string;
}

export const ApiCopyButton = (props: ApiCopyButtonProps) => {
  const { token } = props;
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleCopy = async () => {
    // Use the native clipboard API directly so we can detect failure.
    // The previous `useCopyToClipboard()` wrapper exposed the error on a
    // separate state field that we (and most call sites) silently
    // dropped — meaning the success toast fired even when iOS Safari /
    // a non-secure context / a corporate browser policy rejected the
    // write. The token is only revealed at creation time, so a falsely
    // successful copy here can permanently lose access.
    try {
      await navigator.clipboard.writeText(token);
      toast({ title: t('settings.api.tokenCopiedToast') });
    } catch {
      toast({
        variant: 'destructive',
        title: t('settings.api.tokenCopyFailedToast'),
      });
    }
  };

  return (
    // Guard against the open-while-loading window in `api-row-actions`:
    // the parent flips `revealOpen=true` + `shouldFetchToken=true` in the
    // same frame, so the dialog mounts with `token=''` before the query
    // returns. Without this guard, a fast user could copy an empty string
    // and still see the success toast.
    <Button variant="ghost" size="icon" onClick={handleCopy} disabled={!token}>
      <CopyIcon className="h-4 w-4" />
    </Button>
  );
};
