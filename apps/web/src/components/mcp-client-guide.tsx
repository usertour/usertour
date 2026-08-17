import {
  RiClaudeFill,
  RiCursorAiFill,
  RiOpenaiFill,
  RiPuzzleLine,
  VSCodeIcon,
} from '@usertour/icons';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button } from '@usertour/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CodeBlock } from '@/components/code-block';
import { CopyableInput } from '@/components/copyable-input';

const SERVER_NAME = 'Usertour';

/**
 * Unicode-safe base64. Raw btoa() throws InvalidCharacterError on any character
 * outside Latin-1, so a self-hosted MCP URL with an internationalized domain or
 * non-ASCII path would crash the whole page render — encode the UTF-8 bytes.
 * Callers embedding the result in a URL must still encodeURIComponent it:
 * base64's `+` reads as a SPACE to standard query-string parsing.
 */
const toBase64 = (value: string) => btoa(String.fromCharCode(...new TextEncoder().encode(value)));

/**
 * POSIX shell single-quoting that survives ANY value: a literal `'` closes the
 * quote, inserts an escaped quote, and reopens ('"'"'). Plain '${value}' broke
 * on URLs containing a single quote — which URLs may legally carry.
 */
const shellQuote = (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`;

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

/**
 * Trailing note + command that follow the numbered steps — inset to the same
 * left edge as Step content (20px chip + 10px gap), so every copyable input
 * in an item shares one alignment.
 */
const StepAside = ({ children }: { children: ReactNode }) => (
  <div className="space-y-2 pl-[30px]">{children}</div>
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
  )}&config=${encodeURIComponent(toBase64(JSON.stringify({ url: serverUrl })))}`;
  // shellQuote the URL in every shell command: a self-hosted MCP_SERVER_URL
  // containing &, $, backticks or quotes must survive copy-paste verbatim
  // (double quotes still expand $ and backticks; bare single quotes broke on
  // URLs containing one).
  const claudeCodeCommand = `claude mcp add --transport http usertour ${shellQuote(serverUrl)}`;
  // The plugin's bundled .mcp.json defaults to the cloud endpoint; only a
  // custom/self-hosted instance needs the env override before launch.
  const CLOUD_MCP_URL = 'https://mcp.usertour.io/mcp';
  const needsEnvOverride = serverUrl !== '' && serverUrl !== CLOUD_MCP_URL;
  const envExportCommand = `export USERTOUR_MCP_URL=${shellQuote(serverUrl)}`;
  const mcpServersJson = JSON.stringify(
    { mcpServers: { [SERVER_NAME]: { url: serverUrl } } },
    null,
    2,
  );
  // `codex mcp add --url` registers a streamable-HTTP server directly — no
  // manual config.toml edit needed (config.toml is shared by the CLI and IDE
  // extension either way). Codex does its own OAuth handshake; `mcp login` is
  // the explicit form, offered alongside since the CLI prompts on first use.
  const codexAddCommand = `codex mcp add ${SERVER_NAME.toLowerCase()} --url ${shellQuote(serverUrl)}`;
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
  // VS Code's official MCP install link (vscode:mcp/install?<urlencoded JSON>):
  // opens the editor with the server pre-filled and prompts to install.
  const vscodeDeeplink = `vscode:mcp/install?${encodeURIComponent(
    JSON.stringify({ name: SERVER_NAME.toLowerCase(), type: 'http', url: serverUrl }),
  )}`;
  // Brand colors on the top per-client CTAs only (the "vendor badge" idiom —
  // the button is that product's door, so it wears that product's color);
  // everything else stays on our own design system.
  const brandButton = {
    cursor: 'bg-black text-white hover:bg-neutral-800',
    vscode: 'bg-[#007ACC] text-white hover:bg-[#0066AB]',
    chatgpt: 'bg-black text-white hover:bg-neutral-800',
    claude: 'bg-[#D97757] text-white hover:bg-[#C4633F]',
  };

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
          <CopyableInput value={`/plugin marketplace add ${SKILLS_REPO}`} copiedMessage={copied} />
          <CopyableInput value="/plugin install usertour@usertour" copiedMessage={copied} />
        </Step>
        <Step n={needsEnvOverride ? 3 : 2}>
          <span>{t('settings.mcp.clients.claudeCode.authStep')}</span>
        </Step>
        <StepAside>
          <p className="text-sm text-muted-foreground">
            {t('settings.mcp.clients.claudeCode.mcpOnly')}
          </p>
          <CopyableInput value={claudeCodeCommand} copiedMessage={copied} />
        </StepAside>
      </ClientItem>

      <ClientItem
        value="cursor"
        icon={<RiCursorAiFill className={iconClass} />}
        title={t('settings.mcp.clients.cursor.title')}
        blurb={t('settings.mcp.clients.cursor.blurb')}
      >
        {/* Button FIRST: the deeplink is the whole happy path — one click, no
            reading. Steps only exist for the manual fallback, so this item
            skips numbering entirely. */}
        <Button asChild className={`w-fit ${brandButton.cursor}`}>
          <a href={cursorDeeplink}>{t('settings.mcp.clients.cursor.button')}</a>
        </Button>
        <p className="text-sm text-muted-foreground">
          {t('settings.mcp.clients.cursor.buttonNote')}
        </p>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('settings.mcp.clients.cursor.step2')}</p>
          <CopyableInput value={serverUrl} copiedMessage={copied} />
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('settings.mcp.clients.cursor.skillNote')}
          </p>
          <CopyableInput value={skillsAddCommand} copiedMessage={copied} />
        </div>
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
        <StepAside>
          <p className="text-sm text-muted-foreground">
            {t('settings.mcp.clients.codex.loginNote')}
          </p>
          <CopyableInput value={codexLoginCommand} copiedMessage={copied} />
        </StepAside>
        <StepAside>
          <p className="text-sm text-muted-foreground">
            {t('settings.mcp.clients.codex.skillNote')}
          </p>
          <CopyableInput value={skillsAddCommand} copiedMessage={copied} />
        </StepAside>
      </ClientItem>

      <ClientItem
        value="vscode"
        icon={<VSCodeIcon className={iconClass} />}
        title={t('settings.mcp.clients.vscode.title')}
        blurb={t('settings.mcp.clients.vscode.blurb')}
      >
        <Button asChild className={`w-fit ${brandButton.vscode}`}>
          <a href={vscodeDeeplink}>{t('settings.mcp.clients.vscode.button')}</a>
        </Button>
        <p className="text-sm text-muted-foreground">
          {t('settings.mcp.clients.vscode.buttonNote')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('settings.mcp.clients.vscode.manualLead')}
        </p>
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
        <Button asChild className={`w-fit ${brandButton.chatgpt}`}>
          <a href="https://chatgpt.com/plugins" target="_blank" rel="noreferrer">
            {t('settings.mcp.clients.chatgpt.button')}
          </a>
        </Button>
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
        <Button asChild className={`w-fit ${brandButton.claude}`}>
          <a
            href="https://claude.ai/new#settings/customize-connectors"
            target="_blank"
            rel="noreferrer"
          >
            {t('settings.mcp.clients.claude.button')}
          </a>
        </Button>
        <Step n={1}>
          <span>{t('settings.mcp.clients.claude.step1')}</span>
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
