import { RiCheckboxCircleFill } from '@usertour/icons';
import { SpinnerIcon } from '@usertour/icons';
import { Button, Card, CardContent, ComboboxSelect } from '@usertour/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { AuthCard } from '@/pages/authentication/components/auth-card';

interface ConsentProject {
  id: string;
  name: string;
}

interface ConsentInfo {
  client: { id: string; name: string; logoUri?: string | null; clientUri?: string | null };
  redirectHost: string;
  projects: ConsentProject[];
}

/**
 * OAuth consent screen for MCP connectors. Reached via a redirect from the AS
 * (`/oauth/authorize`). Coarse by design (like Bytebase): the connection acts
 * "with your permissions" on the project you pick — fine-grained least-privilege
 * is the Personal API key's job, so there's no per-scope picker here. Approve
 * issues an authorization code and redirects back to the connector. Built on the
 * shared AuthCard so it matches the sign-in / sign-up surface.
 */
export const OAuthConsent = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const transaction = params.get('transaction') ?? '';

  const [info, setInfo] = useState<ConsentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!transaction) {
      setError(t('oauth.consent.invalidRequest'));
      return;
    }
    let cancelled = false;
    fetch(`/oauth/consent-info?transaction=${encodeURIComponent(transaction)}`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as ConsentInfo;
      })
      .then((data) => {
        if (cancelled) return;
        setInfo(data);
        setProjectId(data.projects[0]?.id ?? '');
      })
      .catch(() => !cancelled && setError(t('oauth.consent.invalidRequest')));
    return () => {
      cancelled = true;
    };
  }, [transaction, t]);

  const projectOptions = useMemo(
    () => (info?.projects ?? []).map((p) => ({ value: p.id, label: p.name })),
    [info],
  );

  const submit = useCallback(
    async (approved: boolean) => {
      setSubmitting(true);
      try {
        const res = await fetch('/oauth/authorize/consent', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ transaction, projectId, approved }),
        });
        const data = (await res.json()) as { redirect?: string };
        if (data.redirect) {
          window.location.href = data.redirect;
          return;
        }
        setError(t('oauth.consent.invalidRequest'));
      } catch {
        setError(t('oauth.consent.invalidRequest'));
      } finally {
        setSubmitting(false);
      }
    },
    [transaction, projectId, t],
  );

  if (error) {
    return <AuthCard title={t('oauth.consent.errorTitle')} description={error} />;
  }

  if (!info) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <SpinnerIcon className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const single = info.projects.length === 1;
  const noProjects = info.projects.length === 0;

  return (
    <AuthCard
      title={t('oauth.consent.title', { client: info.client.name })}
      description={t('oauth.consent.subtitle', { host: info.redirectHost })}
      footer={
        <div className="flex w-full gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={submitting}
            onClick={() => submit(false)}
          >
            {t('oauth.consent.deny')}
          </Button>
          <Button
            className="flex-1"
            disabled={submitting || noProjects || !projectId}
            onClick={() => submit(true)}
          >
            {t('oauth.consent.allow')}
          </Button>
        </div>
      }
    >
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">
          {t('oauth.consent.projectLabel')}
        </span>
        {single ? (
          <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-foreground">
            {info.projects[0].name}
          </div>
        ) : (
          <ComboboxSelect
            className="w-full"
            options={projectOptions}
            value={projectId}
            onValueChange={(v) => setProjectId(v)}
            placeholder={t('oauth.consent.projectLabel')}
          />
        )}
      </div>

      <div className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2.5">
        <RiCheckboxCircleFill
          className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
          aria-hidden="true"
        />
        <span className="text-sm text-foreground">{t('oauth.consent.permissionsNote')}</span>
      </div>

      <p className="text-xs text-muted-foreground">{t('oauth.consent.scopedHint')}</p>
    </AuthCard>
  );
};

OAuthConsent.displayName = 'OAuthConsent';
