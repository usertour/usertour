'use client';

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@usertour/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@usertour/card';
import { Input } from '@usertour/input';
import { SpinnerIcon } from '@usertour/icons';
import { useToast } from '@usertour/use-toast';
import { getErrorMessage } from '@usertour/helpers';
import { useVerifyTwoFactorMutation } from '@usertour/hooks';

export const TwoFactor = () => {
  const { t } = useTranslation('ui');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { invoke, loading } = useVerifyTwoFactorMutation();

  const challengeToken = searchParams.get('challenge') ?? '';
  const [code, setCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!challengeToken) {
      toast({ variant: 'destructive', title: t('twoFactor.errors.challengeExpired') });
      navigate('/auth/signin');
      return;
    }
    try {
      const result = await invoke({
        challengeToken,
        code: code.trim(),
        isRecoveryCode: useRecoveryCode,
      });
      if (result?.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        navigate('/');
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {t('twoFactor.verify.title')}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {useRecoveryCode
              ? t('twoFactor.verify.recoveryDescription')
              : t('twoFactor.verify.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Input
            autoFocus
            inputMode={useRecoveryCode ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            placeholder={
              useRecoveryCode
                ? t('twoFactor.verify.recoveryCodePlaceholder')
                : t('twoFactor.setup.codePlaceholder')
            }
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button className="w-full" type="submit" disabled={loading || !code.trim()}>
            {loading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            {t('twoFactor.verify.submitButton')}
          </Button>
          <button
            type="button"
            onClick={() => {
              setUseRecoveryCode((current) => !current);
              setCode('');
            }}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {useRecoveryCode
              ? t('twoFactor.verify.useAuthenticatorLink')
              : t('twoFactor.verify.useRecoveryCodeLink')}
          </button>
          <Link
            to="/auth/signin"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {t('twoFactor.setup.cancelButton')}
          </Link>
        </CardFooter>
      </Card>
    </form>
  );
};

TwoFactor.displayName = 'TwoFactor';
