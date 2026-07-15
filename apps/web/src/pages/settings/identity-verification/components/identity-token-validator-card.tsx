import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Badge, Button, Input } from '@usertour/ui';
import { type IdentityTokenDiagnosis, useValidateIdentityTokenLazyQuery } from '@usertour/hooks';

export interface IdentityTokenValidatorCardProps {
  environmentId: string;
}

const STATUS_BADGE_VARIANT: Record<IdentityTokenDiagnosis['status'], 'success' | 'destructive'> = {
  valid: 'success',
  expired: 'destructive',
  invalid_signature: 'destructive',
  malformed: 'destructive',
  missing_subject: 'destructive',
};

export const IdentityTokenValidatorCard = (props: IdentityTokenValidatorCardProps) => {
  const { environmentId } = props;
  const { t } = useTranslation();
  const { invoke: validateToken, loading } = useValidateIdentityTokenLazyQuery();
  const [token, setToken] = useState('');
  const [diagnosis, setDiagnosis] = useState<IdentityTokenDiagnosis | null>(null);

  const handleCheck = async () => {
    const result = await validateToken(environmentId, token.trim());
    setDiagnosis(result);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-xl font-medium tracking-tight">
          {t('settings.identityVerification.validator.title')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('settings.identityVerification.validator.description')}
        </p>
      </div>
      <div className="flex gap-2">
        <Input
          value={token}
          onChange={(event) => {
            setToken(event.target.value);
            setDiagnosis(null);
          }}
          placeholder={t('settings.identityVerification.validator.placeholder')}
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={!token.trim() || loading}
          onClick={() => void handleCheck()}
        >
          {t('settings.identityVerification.validator.checkButton')}
        </Button>
      </div>
      {diagnosis && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Badge variant={STATUS_BADGE_VARIANT[diagnosis.status]}>
            {t(`settings.identityVerification.validator.status.${diagnosis.status}`)}
          </Badge>
          {diagnosis.subject && (
            <span className="text-muted-foreground">
              {t('settings.identityVerification.validator.subject')}:{' '}
              <span className="font-mono text-foreground">{diagnosis.subject}</span>
            </span>
          )}
          {diagnosis.companyId && (
            <span className="text-muted-foreground">
              {t('settings.identityVerification.validator.company')}:{' '}
              <span className="font-mono text-foreground">{diagnosis.companyId}</span>
            </span>
          )}
          {diagnosis.expiresAt && (
            <span className="text-muted-foreground">
              {t('settings.identityVerification.validator.expiresAt')}:{' '}
              {format(new Date(diagnosis.expiresAt), 'PPpp')}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

IdentityTokenValidatorCard.displayName = 'IdentityTokenValidatorCard';
