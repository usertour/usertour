import {
  RiClaudeFill,
  RiCursorAiFill,
  RiExternalLinkLine,
  RiOpenaiFill,
  RiPuzzleLine,
  VSCodeIcon,
} from '@usertour/icons';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button } from '@usertour/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CodeBlock } from '@/pages/settings/installation/components/code-block';
import { CopyableInput } from '@/pages/settings/installation/components/copyable-input';

const SERVER_NAME = 'Usertour';

/**
 * Unicode-safe base64. Raw btoa() throws InvalidCharacterError on any character
 * outside Latin-1, so a self-hosted MCP URL with an internationalized domain or
 * non-ASCII path would crash the whole page render — encode the UTF-8 bytes.
 */
const toBase64 = (value: string) => btoa(String.fromCharCode(...new TextEncoder().encode(value)));

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
 * The per-client MCP connection guide (accordion of clients with copyable
 * setup commands). Shared between Settings → MCP and the post-signup
 * connect-AI step, so the two can never drift. Takes the server URL as a
 * prop — reads no app context; strings live under `settings.mcp.clients`.
 */
export const McpClientGuide = ({ serverUrl }: { serverUrl: string }) => {
  const { t } = useTranslation();
  const copied = t('settings.mcp.copied');

  const cursorDeeplink = `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(
    SERVER_NAME.toLowerCase(),
  )}&config=${toBase64(JSON.stringify({ url: serverUrl }))}`;
  const claudeCodeCommand = `claude mcp add --transport http usertour ${serverUrl}`;
  // The plugin's bundled .mcp.json defaults to the cloud endpoint; only a
  // custom/self-hosted instance needs the env override before launch.
  const CLOUD_MCP_URL = 'https://mcp.usertour.io/mcp';
  const needsEnvOverride = serverUrl !== '' && serverUrl !== CLOUD_MCP_URL;
  const envExportCommand = `export USERTOUR_MCP_URL="${serverUrl}"`;
  const mcpServersJson = JSON.stringify(
    { mcpServers: { [SERVER_NAME]: { url: serverUrl } } },
    null,
    2,
  );
  // `codex mcp add --url` registers a streamable-HTTP server directly — no
  // manual config.toml edit needed (config.toml is shared by the CLI and IDE
  // extension either way). Codex does its own OAuth handshake; `mcp login` is
  // the explicit form, offered alongside since the CLI prompts on first use.
  const codexAddCommand = `codex mcp add ${SERVER_NAME.toLowerCase()} --url "${serverUrl}"`;
  const codexLoginCommand = `codex mcp login ${SERVER_NAME.toLowerCase()}`;
  // Skill install is a SEPARATE mechanism from the MCP connection for Cursor and
  // Codex (unlike Claude Code's plugin, which bundles both) — optional, per the
  // skill's own thin-skill/thick-MCP design, so this is a bolt-on note, not a step.
  const SKILLS_REPO = 'usertour/skills';
  const skillsAddCommand = `npx skills add https://github.com/${SKILLS_REPO}`;
  // VS Code's MCP config root key is "servers" (not "mcpServers" — the #1 mistake
  // when copy-pasting a Cursor/Claude config in). No `--add-mcp` CLI form is
  // documented for HTTP/url servers, only for stdio, so this stays manual-edit.
  const vscodeServersJson = JSON.stringify(
    { servers: { [SERVER_NAME.toLowerCase()]: { type: 'http', url: serverUrl } } },
    null,
    2,
  );

  const iconClass = 'h-5 w-5';

  return (
    <Accordion type="single" collapsible className="w-full">
      <ClientItem
        value="claude-code"
        icon={<RiClaudeFill className={iconClass} />}
        title={t('settings.mcp.clients.claudeCode.title')}
        blurb={t('settings.mcp.clients.claudeCode.blurb')}
      >
        {needsEnvOverride && (
          <Step n={1}>
            <span>{t('settings.mcp.clients.claudeCode.envStep')}</span>
            <CopyableInput value={envExportCommand} copiedMessage={copied} />
          </Step>
        )}
        <Step n={needsEnvOverride ? 2 : 1}>
          <span>{t('settings.mcp.clients.claudeCode.pluginStep')}</span>
          <CopyableInput value="/plugin marketplace add usertour/skills" copiedMessage={copied} />
          <CopyableInput value="/plugin install usertour@usertour" copiedMessage={copied} />
        </Step>
        <Step n={needsEnvOverride ? 3 : 2}>
          <span>{t('settings.mcp.clients.claudeCode.authStep')}</span>
        </Step>
        <p className="text-sm text-muted-foreground">
          {t('settings.mcp.clients.claudeCode.mcpOnly')}
        </p>
        <CopyableInput value={claudeCodeCommand} copiedMessage={copied} />
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
        <p className="text-sm text-muted-foreground">
          {t('settings.mcp.clients.cursor.skillNote')}
        </p>
        <CopyableInput value={skillsAddCommand} copiedMessage={copied} />
      </ClientItem>

      <ClientItem
        value="codex"
        icon={<RiOpenaiFill className={iconClass} />}
        title={t('settings.mcp.clients.codex.title')}
        blurb={t('settings.mcp.clients.codex.blurb')}
      >
        <Step n={1}>
          <span>{t('settings.mcp.clients.codex.step1')}</span>
          <CopyableInput value={codexAddCommand} copiedMessage={copied} />
        </Step>
        <p className="text-sm text-muted-foreground">{t('settings.mcp.clients.codex.loginNote')}</p>
        <CopyableInput value={codexLoginCommand} copiedMessage={copied} />
        <p className="text-sm text-muted-foreground">{t('settings.mcp.clients.codex.skillNote')}</p>
        <CopyableInput value={skillsAddCommand} copiedMessage={copied} />
      </ClientItem>

      <ClientItem
        value="vscode"
        icon={<VSCodeIcon className={iconClass} />}
        title={t('settings.mcp.clients.vscode.title')}
        blurb={t('settings.mcp.clients.vscode.blurb')}
      >
        <Step n={1}>
          <span>{t('settings.mcp.clients.vscode.step1')}</span>
        </Step>
        <Step n={2}>
          <span>{t('settings.mcp.clients.vscode.step2')}</span>
          <CodeBlock code={vscodeServersJson} language="javascript" copiedMessage={copied} />
        </Step>
        <Step n={3}>
          <span>{t('settings.mcp.clients.vscode.step3')}</span>
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
        value="other"
        icon={<RiPuzzleLine className={iconClass} />}
        title={t('settings.mcp.clients.other.title')}
        blurb={t('settings.mcp.clients.other.blurb')}
      >
        <p className="text-sm text-muted-foreground">{t('settings.mcp.clients.other.body')}</p>
        <CodeBlock code={mcpServersJson} language="javascript" copiedMessage={copied} />
      </ClientItem>
    </Accordion>
  );
};

McpClientGuide.displayName = 'McpClientGuide';
