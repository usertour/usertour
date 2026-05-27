import { Alert, AlertDescription } from '../primitives/alert';
import { WarningIcon } from '@usertour/icons';

export interface InlineAlertProps {
  message: string;
  variant?: 'warning' | 'info' | 'destructive';
}

// One-line alert for use inside dense form/inspector rows. Caller passes a
// pre-translated message — i18n-agnostic.
export const InlineAlert = (props: InlineAlertProps) => {
  const { message, variant = 'warning' } = props;
  return (
    <Alert variant={variant === 'info' ? 'default' : variant}>
      {variant === 'warning' && <WarningIcon className="h-4 w-4" />}
      <AlertDescription className="text-sm">{message}</AlertDescription>
    </Alert>
  );
};
