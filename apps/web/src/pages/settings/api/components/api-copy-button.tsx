import { Button } from '@usertour/button';
import { CopyIcon } from '@radix-ui/react-icons';
import { useToast } from '@usertour/use-toast';
import { useTranslation } from 'react-i18next';
import { useCopyToClipboard } from 'react-use';

interface ApiCopyButtonProps {
  token: string;
}

export const ApiCopyButton = ({ token }: ApiCopyButtonProps) => {
  const [_, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleCopy = () => {
    copyToClipboard(token);
    toast({
      title: t('settings.api.tokenCopiedToast'),
    });
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
