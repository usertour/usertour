import { SpinnerIcon } from '@usertour/icons';
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  ComboboxSelect,
  FacetedMultiSelect,
  Label,
  QuestionTooltip,
} from '@usertour/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import {
  READ_ONLY_CAPABILITIES,
  ScopesGrid,
  environmentSelectionMissing,
} from '@/components/token-scopes';
import { AuthCard } from '@/pages/authentication/components/auth-card';

interface ConsentProject {
  id: string;
  name: string;
  /** The user's capabilities on this project (cap for what can be granted). */
  capabilities: string[];
  environments: { id: string; name: string }[];
}

interface ConsentInfo {
  client: { id: string; name: string; logoUri?: string | null; clientUri?: string | null };
  redirectHost: string;
  projects: ConsentProject[];
  /** Scopes the client asked for ([] = it asked for nothing → offer the full role). */
  requestedScopes: string[];
}

/**
 * OAuth consent screen for MCP connectors. Reached via a redirect from the AS
 * (`/oauth/authorize`). The user grants a subset of what the client requested ∩ their role
 * on the chosen project, and which environments it may act on (safe-first — none
 * pre-selected). Approve issues an authorization code and redirects back to the connector.
 */
export const OAuthConsent = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const transaction = params.get('transaction') ?? '';

  const [info, setInfo] = useState<ConsentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [environmentIds, setEnvironmentIds] = useState<string[]>([]);
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

  const selectedProject = useMemo(
    () => info?.projects.find((p) => p.id === projectId) ?? null,
    [info, projectId],
  );

  // Max grantable = requested ∩ role (full role if the client asked for nothing).
  const grantable = useMemo(() => {
    const caps = selectedProject?.capabilities ?? [];
    const requested = info?.requestedScopes ?? [];
    return requested.length > 0 ? requested.filter((s) => caps.includes(s)) : caps;
  }, [selectedProject, info]);

  // Default to granting everything requested; reset when the project changes (its
  // capabilities + environments differ). `grantable` is derived from projectId + info.
  useEffect(() => {
    setScopes(grantable);
    // A single-environment project is unambiguous — pre-select its only environment.
    // Safe-first "none pre-selected" only protects when there is a choice to make.
    const envs = info?.projects.find((p) => p.id === projectId)?.environments ?? [];
    setEnvironmentIds(envs.length === 1 ? [envs[0].id] : []);
  }, [projectId, info]);

  const isReadOnly = scopes.length > 0 && scopes.every((s) => READ_ONLY_CAPABILITIES.includes(s));
  const envRequired = environmentSelectionMissing(scopes, environmentIds);

  const submit = useCallback(
    async (approved: boolean) => {
      setSubmitting(true);
      try {
        const res = await fetch('/oauth/authorize/consent', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ transaction, projectId, approved, scopes, environmentIds }),
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
    [transaction, projectId, scopes, environmentIds, t],
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
  const environments = selectedProject?.environments ?? [];

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
            disabled={submitting || noProjects || !projectId || envRequired || scopes.length === 0}
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
            options={info.projects.map((p) => ({ value: p.id, label: p.name }))}
            value={projectId}
            onValueChange={(v) => setProjectId(v)}
            placeholder={t('oauth.consent.projectLabel')}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">
            {t('oauth.consent.environmentsLabel')}
          </span>
          <QuestionTooltip>{t('oauth.consent.environmentsHelp')}</QuestionTooltip>
        </div>
        <FacetedMultiSelect
          label={t('oauth.consent.environmentsSelect')}
          options={environments.map((e) => ({ label: e.name, value: e.id }))}
          value={environmentIds}
          onChange={setEnvironmentIds}
        />
        {envRequired && (
          <p className="text-xs text-destructive">{t('oauth.consent.selectEnvironment')}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            {t('oauth.consent.scopesLabel')}
          </span>
          <div className="flex items-center gap-2">
            <Checkbox
              id="consent-readonly"
              checked={isReadOnly}
              onCheckedChange={(checked) =>
                setScopes(
                  checked === true
                    ? grantable.filter((s) => READ_ONLY_CAPABILITIES.includes(s))
                    : grantable,
                )
              }
            />
            <Label htmlFor="consent-readonly" className="cursor-pointer font-normal">
              {t('oauth.consent.readOnly')}
            </Label>
          </div>
        </div>
        <ScopesGrid value={scopes} onChange={setScopes} available={grantable} />
        {selectedProject && grantable.length === 0 && (
          <p className="text-xs text-destructive">{t('oauth.consent.noGrantableScopes')}</p>
        )}
      </div>
    </AuthCard>
  );
};

OAuthConsent.displayName = 'OAuthConsent';
