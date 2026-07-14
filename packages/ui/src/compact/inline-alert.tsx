import { Alert, AlertDescription } from '../primitives/alert';
import { RiInformationLine, WarningIcon } from '@usertour/icons';

export interface InlineAlertProps {
  message: string;
  variant?: 'warning' | 'info' | 'destructive';
}

// One-line alert for use inside dense form/inspector rows. Caller passes a
// pre-translated message — i18n-agnostic. The base Alert pins its icon
// absolutely for multi-line title layouts; a single line wants the icon and
// text on one centered flex row, so those positioning rules are overridden.
export const InlineAlert = (props: InlineAlertProps) => {
  const { message, variant = 'warning' } = props;
  return (
    <Alert
      variant={variant}
      className="flex items-center gap-2.5 [&:has(svg)]:pl-4 [&>svg]:static [&>svg+div]:translate-y-0"
    >
      {variant === 'warning' && <WarningIcon className="h-4 w-4 flex-none" />}
      {variant === 'info' && <RiInformationLine className="h-4 w-4 flex-none" />}
      <AlertDescription className="text-sm">{message}</AlertDescription>
    </Alert>
  );
};
