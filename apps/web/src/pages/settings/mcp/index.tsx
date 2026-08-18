import { McpClientGuide } from '@/components/mcp-client-guide';
import { useAppContext } from '@/contexts/app-context';
import { RiErrorWarningLine } from '@usertour/icons';
import {
  Alert,
  AlertDescription,
  Badge,
  Label,
  Separator,
  SettingsCard,
  SettingsCardStack,
} from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CopyableInput } from '@/components/copyable-input';
import { ExternalLink } from '@/components/external-link';

/**
 * Settings → MCP: the in-app signpost for connecting AI assistants. One server
 * for everything — what a connection may do (project, environments, read-only)
 * is chosen on the OAuth consent screen at connect time, not by picking a
 * different endpoint. The per-client guide itself lives in McpClientGuide,
 * shared with the post-signup connect-AI step.
 */
export const SettingsMcpPage = () => {
  const { t } = useTranslation();
  const { project, globalConfig } = useAppContext();

  // The endpoint lives on the API server, not this web origin — the server
  // reports the full URL via resolveMcpResource (MCP_SERVER_URL env, else
  // `${API_URL}/mcp`, else derived from the request). Never synthesize a
  // fallback here: this display must stay byte-identical to the OAuth
  // metadata `resource` the server advertises, or MCP clients refuse the
  // mismatch (RFC 9728).
  const serverUrl = globalConfig?.mcpServerUrl ?? '';
  const copied = t('settings.mcp.copied');

  return (
    <SettingsCardStack>
      {/* Server */}
      <SettingsCard>
        <div className="space-y-6">
          {/* Title + description grouped tightly, then the separator (SSO pattern). */}
          <div className="space-y-2">
            <div className="flex h-10 flex-row items-center gap-2">
              <h3 className="text-xl font-medium tracking-tight">{t('settings.mcp.title')}</h3>
              <Badge variant="secondary" className="font-normal">
                {t('settings.mcp.betaBadge')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('settings.mcp.subtitle')}{' '}
              <ExternalLink href="https://docs.usertour.io/api-reference-v2/mcp">
                {t('settings.mcp.docsLink')}
              </ExternalLink>
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
          <McpClientGuide serverUrl={serverUrl} />

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
