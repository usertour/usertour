import { Alert, AlertDescription } from '@usertour-packages/alert';
import { WarningIcon } from '@usertour-packages/icons';

interface Props {
  message: string;
  variant?: 'warning' | 'info' | 'destructive';
}

export function InlineAlert({ message, variant = 'warning' }: Props) {
  return (
    <Alert variant={variant === 'info' ? 'default' : variant}>
      {variant === 'warning' && <WarningIcon className="h-4 w-4" />}
      <AlertDescription className="text-xs">{message}</AlertDescription>
    </Alert>
  );
}
