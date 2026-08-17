import { CopyableInput } from '@/components/copyable-input';
import { ExternalLink } from '@/components/external-link';
import { McpClientGuide } from '@/components/mcp-client-guide';
import { useAppContext } from '@/contexts/app-context';
import { useOAuthConnectionsQuery } from '@usertour/hooks';
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckboxCircleFill,
  RiDashboardLine,
  RiMagicLine,
} from '@usertour/icons';
import { Badge, Button, Label, Separator } from '@usertour/ui';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * A copyable first prompt, deliberately generic (works against any app) and
 * ending in a DRAFT so the assistant's very first act can't publish anything.
 * Not translated: prompts are authored in English either way.
 */
const STARTER_PROMPT =
  "Using Usertour, build a short onboarding flow for my app's most important feature — match my app's visual style, keep every step genuinely useful, and save it as a draft for me to review.";

/** The card body shared by all three states (AuthLayout provides the backdrop). */
const Shell = ({ children }: { children: ReactNode }) => (
  <div className="space-y-6 rounded-lg bg-background p-6 sm:p-8">{children}</div>
);

/** One of the two starting-point cards on the choice screen. */
const ChoiceCard = ({
  icon,
  title,
  badge,
  blurb,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  badge?: string;
  blurb: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col items-start gap-3 rounded-xl border border-border p-5 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">{icon}</div>
    <div className="flex items-center gap-2">
      <span className="text-base font-medium">{title}</span>
      {badge && (
        <Badge variant="secondary" className="font-normal">
          {badge}
        </Badge>
      )}
    </div>
    <p className="text-sm text-muted-foreground">{blurb}</p>
  </button>
);

/**
 * Post-signup interstitial. Reached ONLY on account creation — the email form
 * routes here via landingPath and the social callback via the server-side
 * isNewUser landing; logins and invites never do, so no "seen it" flag is
 * needed. Best-effort by design: closing the tab skips it for good, and
 * everything it offers stays reachable under Settings → MCP.
 *
 * Two states: a CHOICE first (AI assistants are a developer path — a PM must
 * not land on a wall of terminal commands), then the client guide only for
 * those who picked AI. The OAuth-connection poll flips either state into the
 * success view the moment an authorization lands.
 */
export const OnboardingConnectAi = () => {
  const { t } = useTranslation();
  const [path, setPath] = useState<'choice' | 'ai'>('choice');

  // Same single source as Settings → MCP: the server-advertised endpoint
  // (never synthesized here — must stay byte-identical to the OAuth metadata).
  // Read from AppContext, not a second query: AuthGuard only mounts children
  // after the context's globalConfig resolved, and a duplicate no-cache fetch
  // could independently fail and misreport "couldn't load" over good config.
  const { globalConfig } = useAppContext();
  const serverUrl = globalConfig?.mcpServerUrl ?? '';
  const copied = t('settings.mcp.copied');

  // A fresh signup has zero connections, so the first one appearing means the
  // user just finished the OAuth consent in their assistant. Poll ONLY while
  // it can matter: on the guide state, not yet connected, tab visible.
  // (`connectionSeen` mirrors the result into state because the poll interval
  // can't read the query's own return value.)
  const [connectionSeen, setConnectionSeen] = useState(false);
  const { connections } = useOAuthConnectionsQuery({
    pollInterval: path === 'ai' && !connectionSeen ? 4000 : 0,
    skipPollAttempt: () => document.hidden,
    fetchPolicy: 'network-only',
  });
  const connected = connections.length > 0;
  useEffect(() => {
    if (connected) {
      setConnectionSeen(true);
    }
  }, [connected]);

  const continueToApp = () => {
    // Hard load, not navigate: LandingRedirect resolves the env on a fresh
    // boot. No ?next= handling — nothing routes here with one. `replace`
    // drops this one-shot page from history so Back can't resurrect it.
    window.location.replace('/');
  };

  if (connected) {
    return (
      <Shell>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <RiCheckboxCircleFill className="h-5 w-5 text-success" />
            <span className="text-base font-medium">
              {t('onboarding.connectAi.connectedTitle', {
                name: connections[0].clientName,
              })}
            </span>
          </div>
          <div className="space-y-1.5">
            <Label>{t('onboarding.connectAi.connectedSubtitle')}</Label>
            <CopyableInput value={STARTER_PROMPT} copiedMessage={copied} />
          </div>
          <Button className="w-full" onClick={continueToApp}>
            {t('onboarding.connectAi.goToDashboard')}
          </Button>
        </div>
      </Shell>
    );
  }

  if (path === 'choice') {
    return (
      <Shell>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t('onboarding.start.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('onboarding.start.subtitle')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ChoiceCard
            icon={<RiMagicLine className="h-5 w-5" />}
            title={t('onboarding.start.ai.title')}
            badge={t('settings.mcp.betaBadge')}
            blurb={t('onboarding.start.ai.blurb')}
            onClick={() => setPath('ai')}
          />
          <ChoiceCard
            icon={<RiDashboardLine className="h-5 w-5" />}
            title={t('onboarding.start.builder.title')}
            blurb={t('onboarding.start.builder.blurb')}
            onClick={continueToApp}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {t('onboarding.connectAi.skipNote')}
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-2">
        <div className="flex flex-row items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('onboarding.connectAi.title')}
          </h1>
          <Badge variant="secondary" className="font-normal">
            {t('settings.mcp.betaBadge')}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('onboarding.connectAi.subtitle')}{' '}
          <ExternalLink href="https://docs.usertour.io/build-onboarding-with-ai">
            {t('onboarding.connectAi.docsLink')}
          </ExternalLink>
        </p>
      </div>

      <Separator />

      {serverUrl === '' ? (
        // Config resolved but carries no MCP URL (the context query failed or
        // the server answered empty) — an honest note beats copyable blanks.
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t('onboarding.connectAi.configError')}
        </p>
      ) : (
        <McpClientGuide serverUrl={serverUrl} />
      )}

      {/* Wizard footer. The advance label is deliberately NEUTRAL ("Continue",
          not "Skip") — a user who just finished the setup but whose
          authorization hasn't landed yet (the alternative `claude mcp add`
          path authorizes on first tool use) exits through this same button,
          and "Skip" would read as "it didn't work". */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <Button variant="ghost" onClick={() => setPath('choice')}>
          <RiArrowLeftLine className="mr-1.5 h-4 w-4" />
          {t('onboarding.connectAi.back')}
        </Button>
        <Button variant="outline" className="shrink-0" onClick={continueToApp}>
          {t('onboarding.connectAi.continue')}
          <RiArrowRightLine className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </Shell>
  );
};

OnboardingConnectAi.displayName = 'OnboardingConnectAi';
