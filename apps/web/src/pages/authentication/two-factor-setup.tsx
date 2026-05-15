'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Checkbox } from '@usertour/checkbox';
import { SpinnerIcon } from '@usertour/icons';
import { useToast } from '@usertour/use-toast';
import { getErrorMessage } from '@usertour/helpers';
import {
  TwoFactorSetupPayload,
  useConfirmTwoFactorSetupMutation,
  useConfirmTwoFactorSetupWithChallengeMutation,
  useStartTwoFactorSetupMutation,
  useStartTwoFactorSetupWithChallengeMutation,
} from '@usertour/hooks';
import { getUserInfo } from '@usertour/gql';
import { useApolloClient } from '@apollo/client';

type Stage = 'scan' | 'codes';

export const TwoFactorSetup = () => {
  const { t } = useTranslation('ui');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const apollo = useApolloClient();

  const challengeToken = searchParams.get('challenge') ?? '';
  const hasChallenge = !!challengeToken;

  const startWithChallenge = useStartTwoFactorSetupWithChallengeMutation();
  const confirmWithChallenge = useConfirmTwoFactorSetupWithChallengeMutation();
  const startLoggedIn = useStartTwoFactorSetupMutation();
  const confirmLoggedIn = useConfirmTwoFactorSetupMutation();
  const confirmSavedId = useId();

  const [setupPayload, setSetupPayload] = useState<TwoFactorSetupPayload | null>(null);
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<Stage>('scan');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetcher = hasChallenge
      ? startWithChallenge.invoke(challengeToken)
      : startLoggedIn.invoke();
    fetcher
      .then((payload) => {
        if (payload) {
          setSetupPayload(payload);
        }
      })
      .catch((error) => {
        toast({ variant: 'destructive', title: getErrorMessage(error) });
        if (hasChallenge) {
          navigate('/auth/signin');
        } else {
          navigate('/');
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeToken, hasChallenge]);

  const codesText = useMemo(() => recoveryCodes.join('\n'), [recoveryCodes]);
  const verifyLoading = hasChallenge ? confirmWithChallenge.loading : confirmLoggedIn.loading;

  const onVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!setupPayload) {
      return;
    }
    try {
      if (hasChallenge) {
        const result = await confirmWithChallenge.invoke({
          secret: setupPayload.secret,
          code: code.trim(),
          challengeToken,
        });
        if (!result) {
          return;
        }
        setRecoveryCodes(result.recoveryCodes);
        setRedirectUrl(result.auth?.redirectUrl ?? null);
      } else {
        const codes = await confirmLoggedIn.invoke(setupPayload.secret, code.trim());
        if (!codes) {
          return;
        }
        setRecoveryCodes(codes);
        apollo.cache.evict({ fieldName: 'me' });
        apollo.cache.gc();
        await apollo.refetchQueries({ include: [getUserInfo] }).catch(() => undefined);
      }
      setStage('codes');
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const onCopy = async () => {
    await navigator.clipboard.writeText(codesText);
    toast({ title: t('twoFactor.setup.copiedToast') });
  };

  const onDownload = () => {
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'usertour-2fa-recovery-codes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const onFinish = () => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      navigate('/');
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {t('twoFactor.setup.title')}
        </CardTitle>
        {stage === 'scan' && (
          <CardDescription className="text-sm text-muted-foreground">
            {t('twoFactor.setup.step1Description')}
          </CardDescription>
        )}
      </CardHeader>

      {stage === 'scan' && (
        <form onSubmit={onVerify}>
          <CardContent className="grid gap-4">
            {!setupPayload && (
              <div className="flex items-center justify-center py-12">
                <SpinnerIcon className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {setupPayload && (
              <>
                <div className="flex justify-center">
                  <img
                    src={setupPayload.qrDataUri}
                    alt="QR code"
                    className="h-44 w-44 rounded border border-border bg-white p-2"
                  />
                </div>
                <details className="text-sm text-muted-foreground">
                  <summary className="cursor-pointer">{t('twoFactor.setup.manualEntry')}</summary>
                  <code className="mt-2 block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
                    {setupPayload.secret}
                  </code>
                </details>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('twoFactor.setup.step2Title')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('twoFactor.setup.step2Description')}
                  </p>
                  <Input
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder={t('twoFactor.setup.codePlaceholder')}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              type="submit"
              disabled={!setupPayload || verifyLoading || !code.trim()}
            >
              {verifyLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              {t('twoFactor.setup.verifyButton')}
            </Button>
          </CardFooter>
        </form>
      )}

      {stage === 'codes' && (
        <>
          <CardContent className="space-y-4">
            <CardDescription className="text-sm text-muted-foreground">
              {t('twoFactor.setup.step3Description')}
            </CardDescription>
            <div className="grid grid-cols-2 gap-2 rounded border border-border bg-muted p-3 font-mono text-sm">
              {recoveryCodes.map((recoveryCode) => (
                <span key={recoveryCode}>{recoveryCode}</span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onDownload}>
                {t('twoFactor.setup.downloadButton')}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={onCopy}>
                {t('twoFactor.setup.copyButton')}
              </Button>
            </div>
            <label htmlFor={confirmSavedId} className="flex items-center gap-2 text-sm">
              <Checkbox
                id={confirmSavedId}
                checked={savedConfirmed}
                onCheckedChange={(checked) => setSavedConfirmed(checked === true)}
              />
              <span>{t('twoFactor.setup.confirmSaved')}</span>
            </label>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="button" disabled={!savedConfirmed} onClick={onFinish}>
              {t('twoFactor.setup.finishButton')}
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
};

TwoFactorSetup.displayName = 'TwoFactorSetup';
