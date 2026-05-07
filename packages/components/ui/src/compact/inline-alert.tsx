import { Alert, AlertDescription } from '@usertour-packages/alert';
import { WarningIcon } from '@usertour-packages/icons';

interface Props {
  message: string;
  variant?: 'warning' | 'info' | 'destructive';
}

// One-line alert for use inside dense form/inspector rows. Caller passes a
// pre-translated message — i18n-agnostic.
export function InlineAlert({ message, variant = 'warning' }: Props) {
  return (
    <Alert variant={variant === 'info' ? 'default' : variant}>
      {variant === 'warning' && <WarningIcon className="h-4 w-4" />}
      <AlertDescription className="text-sm">{message}</AlertDescription>
    </Alert>
  );
}
