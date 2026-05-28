import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@usertour/ui';

export interface CodeFieldProps {
  useRecoveryCode: boolean;
  code: string;
  onCodeChange: (value: string) => void;
  onToggleMode: () => void;
}

/**
 * Shared "authenticator or recovery code" input used by the disable and
 * regenerate dialogs. Wraps a labelled `Input` plus the toggle link that
 * flips the mode and clears the value.
 */
export const CodeField = (props: CodeFieldProps) => {
  const { useRecoveryCode, code, onCodeChange, onToggleMode } = props;
  const { t } = useTranslation('ui');
  const inputId = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        {useRecoveryCode
          ? t('twoFactor.codeLabel.recoveryCode')
          : t('twoFactor.codeLabel.authenticator')}
      </label>
      <Input
        id={inputId}
        autoFocus
        inputMode={useRecoveryCode ? 'text' : 'numeric'}
        autoComplete="one-time-code"
        placeholder={
          useRecoveryCode
            ? t('twoFactor.verify.recoveryCodePlaceholder')
            : t('twoFactor.setup.codePlaceholder')
        }
        value={code}
        onChange={(event) => onCodeChange(event.target.value)}
      />
      <button
        type="button"
        onClick={onToggleMode}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
      >
        {useRecoveryCode
          ? t('twoFactor.verify.useAuthenticatorLink')
          : t('twoFactor.verify.useRecoveryCodeLink')}
      </button>
    </div>
  );
};
