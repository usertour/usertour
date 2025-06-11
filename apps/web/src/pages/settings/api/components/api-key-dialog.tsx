import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@usertour-ui/dialog';
import { ApiCopyButton } from './api-copy-button';

interface ApiKeyDialogProps {
  token: string;
  title?: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ApiKeyDialog = ({
  token,
  title = 'API Key',
  description = 'Please copy your API key now.',
  open,
  onOpenChange,
}: ApiKeyDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">API key</span>
          <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
            <code className="text-sm flex-1">{token}</code>
            <ApiCopyButton token={token} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
