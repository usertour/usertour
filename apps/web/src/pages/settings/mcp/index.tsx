import { useAppContext } from '@/contexts/app-context';
import {
  RiClaudeFill,
  RiCursorAiFill,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiOpenaiFill,
  RiPuzzleLine,
} from '@usertour/icons';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  Button,
  Label,
  Separator,
  SettingsCard,
  SettingsCardStack,
} from '@usertour/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CodeBlock } from '../installation/components/code-block';
import { CopyableInput } from '../installation/components/copyable-input';

const SERVER_NAME = 'Usertour';

/** Numbered manual step line (mirrors the connector guides users already know). */
const Step = ({ n, children }: { n: number; children: ReactNode }) => (
  <div className="flex gap-2.5 text-sm leading-6">
    {/* mt-0.5 optically centers the 20px chip on the 24px first text line. */}
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
      {n}
    </span>
    <div className="min-w-0 flex-1 space-y-2">{children}</div>
  </div>
);

/** One client = one bordered card: brand icon + title + blurb, steps unfold below. */
const ClientItem = ({
  value,
  icon,
  title,
  blurb,
  children,
}: {
  value: string;
  icon: ReactNode;
  title: string;
  blurb: string;
  children: ReactNode;
}) => (
  <AccordionItem value={value} className="border-b last:border-b-0">
    <AccordionTrigger className="py-3.5 hover:no-underline">
      <div className="flex items-center gap-3 text-left">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs font-normal text-muted-foreground">{blurb}</div>
        </div>
      </div>
    </AccordionTrigger>
    {/* Spacing lives on an inner div — padding on the height-animated
        AccordionContent itself makes the collapse end in a visible snap. */}
    <AccordionContent>
      <div className="space-y-4 pb-1 pt-1">{children}</div>
    </AccordionContent>
  </AccordionItem>
);

/**
 * Settings → MCP: the in-app signpost for connecting AI assistants. One server
 * for everything — what a connection may do (project, environments, read-only)
 * is chosen on the OAuth consent screen at connect time, not by picking a
 * different endpoint.
 */
export const SettingsMcpPage = () => {
  const { t } = useTranslation();
  const { project, globalConfig } = useAppContext();

  // The endpoint lives on the API server, not this web origin — the server
  // reports the full URL (MCP_SERVER_URL env, defaulting to `${API_URL}/mcp`).
  const serverUrl = globalConfig?.mcpServerUrl ?? '';
  const copied = t('settings.mcp.copied');

  const cursorDeeplink = `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(
    SERVER_NAME.toLowerCase(),
  )}&config=${btoa(JSON.stringify({ url: serverUrl }))}`;
  const claudeCodeCommand = `claude mcp add --transport http usertour ${serverUrl}`;
  const mcpServersJson = JSON.stringify(
    { mcpServers: { [SERVER_NAME]: { url: serverUrl } } },
    null,
    2,
  );

  const iconClass = 'h-5 w-5';

  return (
    <SettingsCardStack>
      {/* Server */}
      <SettingsCard>
        <div className="space-y-6">
          {/* Title + description grouped tightly, then the separator (SSO pattern). */}
          <div className="space-y-2">
            <div className="flex h-10 flex-row items-center">
              <h3 className="text-xl font-medium tracking-tight">{t('settings.mcp.title')}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('settings.mcp.subtitle')}{' '}
              <a
                href="https://docs.usertour.io/api-reference-v2/mcp"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                {t('settings.mcp.docsLink')}
                <RiExternalLinkLine className="h-3.5 w-3.5" />
              </a>
            </p>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label>{t('settings.mcp.serverUrlLabel')}</Label>
            <CopyableInput value={serverUrl} copiedMessage={copied} />
            <p className="text-sm text-muted-foreground">{t('settings.mcp.consentNote')}</p>
          </div>
          <div className="space-y-3">
            <Alert className="border-warning/40 bg-warning/10 [&:has(svg)]:pl-4">
              {/* Icon flows with the text (the Alert's own svg slot pins it to the
                  top corner, which drifts on single-line notes). */}
              <AlertDescription className="flex gap-2.5">
                <RiErrorWarningLine className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>{t('settings.mcp.notes.permissions')}</span>
              </AlertDescription>
            </Alert>
            <Alert className="border-warning/40 bg-warning/10 [&:has(svg)]:pl-4">
              <AlertDescription className="flex gap-2.5">
                <RiErrorWarningLine className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>{t('settings.mcp.notes.audit')}</span>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </SettingsCard>

      {/* Clients */}
      <SettingsCard>
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-medium tracking-tight">{t('settings.mcp.clientsTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('settings.mcp.clientsSubtitle')}</p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <ClientItem
              value="claude"
              icon={<RiClaudeFill className={iconClass} />}
              title={t('settings.mcp.clients.claude.title')}
              blurb={t('settings.mcp.clients.claude.blurb')}
            >
              <Step n={1}>
                <span>
                  {t('settings.mcp.clients.claude.step1')}{' '}
                  <a
                    href="https://claude.ai/settings/connectors"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                  >
                    claude.ai/settings/connectors
                    <RiExternalLinkLine className="h-3.5 w-3.5" />
                  </a>
                </span>
              </Step>
              <Step n={2}>
                <span>{t('settings.mcp.clients.claude.step2')}</span>
                <CopyableInput value={SERVER_NAME} copiedMessage={copied} />
              </Step>
              <Step n={3}>
                <span>{t('settings.mcp.clients.claude.step3')}</span>
                <CopyableInput value={serverUrl} copiedMessage={copied} />
              </Step>
              <Step n={4}>
                <span>{t('settings.mcp.clients.claude.step4')}</span>
              </Step>
            </ClientItem>

            <ClientItem
              value="chatgpt"
              icon={<RiOpenaiFill className={iconClass} />}
              title={t('settings.mcp.clients.chatgpt.title')}
              blurb={t('settings.mcp.clients.chatgpt.blurb')}
            >
              <Step n={1}>
                <span>{t('settings.mcp.clients.chatgpt.step1')}</span>
              </Step>
              <Step n={2}>
                <span>{t('settings.mcp.clients.chatgpt.step2')}</span>
                <CopyableInput value={SERVER_NAME} copiedMessage={copied} />
                <CopyableInput value={serverUrl} copiedMessage={copied} />
              </Step>
              <Step n={3}>
                <span>{t('settings.mcp.clients.chatgpt.step3')}</span>
              </Step>
            </ClientItem>

            <ClientItem
              value="cursor"
              icon={<RiCursorAiFill className={iconClass} />}
              title={t('settings.mcp.clients.cursor.title')}
              blurb={t('settings.mcp.clients.cursor.blurb')}
            >
              <Step n={1}>
                <span>{t('settings.mcp.clients.cursor.step1')}</span>
                <Button asChild className="w-fit">
                  <a href={cursorDeeplink}>{t('settings.mcp.clients.cursor.button')}</a>
                </Button>
              </Step>
              <Step n={2}>
                <span>{t('settings.mcp.clients.cursor.step2')}</span>
                <CopyableInput value={serverUrl} copiedMessage={copied} />
              </Step>
            </ClientItem>

            <ClientItem
              value="claude-code"
              icon={<RiClaudeFill className={iconClass} />}
              title={t('settings.mcp.clients.claudeCode.title')}
              blurb={t('settings.mcp.clients.claudeCode.blurb')}
            >
              <Step n={1}>
                <span>{t('settings.mcp.clients.claudeCode.step1')}</span>
                <CopyableInput value={claudeCodeCommand} copiedMessage={copied} />
              </Step>
              <Step n={2}>
                <span>{t('settings.mcp.clients.claudeCode.step2')}</span>
              </Step>
            </ClientItem>

            <ClientItem
              value="other"
              icon={<RiPuzzleLine className={iconClass} />}
              title={t('settings.mcp.clients.other.title')}
              blurb={t('settings.mcp.clients.other.blurb')}
            >
              <p className="text-sm text-muted-foreground">
                {t('settings.mcp.clients.other.body')}
              </p>
              <CodeBlock code={mcpServersJson} language="javascript" copiedMessage={copied} />
            </ClientItem>
          </Accordion>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              {t('settings.mcp.manage.prefix')}{' '}
              <Link
                to={`/project/${project?.id}/settings/connected-apps`}
                className="text-primary hover:underline"
              >
                {t('settings.mcp.manage.connectedApps')}
              </Link>
              {t('settings.mcp.manage.suffix')}
            </p>
            <p>
              {t('settings.mcp.apiKeyNote.prefix')}{' '}
              <Link
                to={`/project/${project?.id}/settings/personal-api-keys`}
                className="text-primary hover:underline"
              >
                {t('settings.mcp.apiKeyNote.link')}
              </Link>
              {t('settings.mcp.apiKeyNote.suffix')}
            </p>
          </div>
        </div>
      </SettingsCard>
    </SettingsCardStack>
  );
};

SettingsMcpPage.displayName = 'SettingsMcpPage';
