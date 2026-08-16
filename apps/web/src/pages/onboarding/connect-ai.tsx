import { McpClientGuide } from '@/components/mcp-client-guide';
import { useGlobalConfig } from '@/hooks/use-global-config';
import { resolveNextPath } from '@/pages/authentication/components/use-auth-after-login';
import { CopyableInput } from '@/pages/settings/installation/components/copyable-input';
import { useOAuthConnectionsQuery } from '@usertour/hooks';
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckboxCircleFill,
  RiDashboardLine,
  RiExternalLinkLine,
  RiMagicLine,
} from '@usertour/icons';
import { Badge, Button, Label, Separator } from '@usertour/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

/**
 * A copyable first prompt, deliberately generic (works against any app) and
 * ending in a DRAFT so the assistant's very first act can't publish anything.
 * Not translated: prompts are authored in English either way.
 */
const STARTER_PROMPT =
  "Using Usertour, build a short onboarding flow for my app's most important feature — match my app's visual style, keep every step genuinely useful, and save it as a draft for me to review.";

/** One of the two starting-point cards on the choice screen. */
const ChoiceCard = ({
  icon,
  title,
  badge,
  blurb,
  onClick,
}: {
  icon: React.ReactNode;
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
 * Post-signup interstitial. Reached ONLY from a fresh (non-invite) signup —
 * login and invites never route here, and a signup carrying ?next= (e.g. an
 * interrupted MCP consent) bypasses it upstream.
 *
 * Two states: a CHOICE first (AI assistants are a developer path — a PM must
 * not land on a wall of terminal commands), then the client guide only for
 * those who picked AI. The OAuth-connection poll flips either state into the
 * success view the moment an authorization lands.
 */
export const OnboardingConnectAi = () => {
  const { t } = useTranslation();
  const { globalConfig } = useGlobalConfig();
  const [searchParams] = useSearchParams();
  const [path, setPath] = useState<'choice' | 'ai'>('choice');

  // Same single source as Settings → MCP: the server-advertised endpoint
  // (never synthesized here — must stay byte-identical to the OAuth metadata).
  const serverUrl = globalConfig?.mcpServerUrl ?? '';
  const copied = t('settings.mcp.copied');

  // A fresh signup has zero connections, so the first one appearing means the
  // user just finished the OAuth consent in their assistant.
  const { connections } = useOAuthConnectionsQuery({
    pollInterval: 4000,
    fetchPolicy: 'network-only',
  });
  const connected = connections.length > 0;

  const continueToApp = () => {
    window.location.assign(resolveNextPath(searchParams.get('next')));
  };

  if (connected) {
    return (
      <div className="space-y-6 rounded-lg bg-background p-6 sm:p-8">
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
      </div>
    );
  }

  if (path === 'choice') {
    return (
      <div className="space-y-6 rounded-lg bg-background p-6 sm:p-8">
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
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg bg-background p-6 sm:p-8">
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
          <a
            href="https://docs.usertour.io/build-onboarding-with-ai"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            {t('onboarding.connectAi.docsLink')}
            <RiExternalLinkLine className="h-3.5 w-3.5" />
          </a>
        </p>
      </div>

      <Separator />

      <McpClientGuide serverUrl={serverUrl} />

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
    </div>
  );
};

OnboardingConnectAi.displayName = 'OnboardingConnectAi';
