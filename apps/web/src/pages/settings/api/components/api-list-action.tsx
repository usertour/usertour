import { Button } from '@usertour-ui/button';
import { CopyIcon } from '@radix-ui/react-icons';
import { useToast } from '@usertour-ui/use-toast';
import { useCopyToClipboard } from 'react-use';

interface ApiListActionProps {
  token: string;
}

export const ApiListAction = ({ token }: ApiListActionProps) => {
  const [_, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();

  const handleCopy = () => {
    copyToClipboard(token);
    toast({
      title: 'Token copied to clipboard',
    });
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleCopy}>
      <CopyIcon className="h-4 w-4" />
    </Button>
  );
};
