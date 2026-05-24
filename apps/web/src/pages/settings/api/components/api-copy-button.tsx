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
    <Button variant="ghost" size="icon" onClick={handleCopy}>
      <CopyIcon className="h-4 w-4" />
    </Button>
  );
};
