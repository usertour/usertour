import { RiJavascriptFill, RiNpmjsFill } from '@usertour/icons';
import { useGetUserEnvironmentsQuery } from '@usertour/hooks';
import {
  InlineAlert,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  SettingsCard,
  SettingsCardStack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@usertour/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';
import { CodeBlock } from './components/code-block';
import { CopyableInput } from './components/copyable-input';
import { VerifyInstallation } from './components/verify-installation';
import {
  NPM_INSTALL_COMMAND,
  buildHtmlCode,
  buildNpmCode,
  buildSelfHostedEnvVars,
} from './snippet';

const INSTALL_DOCS_HREF = 'https://docs.usertour.io/developers/usertourjs-installation/';

/**
 * Settings → Installation: a field-style setup form. Environment + token are
 * shared (the token is baked into the code, so there's no hand-replacing
 * USERTOUR_TOKEN), then a tab inside the next card picks the install method —
 * Npm (bundler) or HTML (script snippet). Self-hosted deployments also get the
 * USERTOURJS_ENV_VARS block pointed at their server.
 */
export const SettingsInstallation = () => {
  const { project, globalConfig } = useAppContext();
  const { t } = useTranslation();
  const { environmentList } = useGetUserEnvironmentsQuery(project?.id, SHARED_CACHE_QUERY_OPTIONS);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>();

  // Default to the primary environment; fall back to the first one.
  const selectedEnvironment =
    environmentList?.find((environment) => environment.id === selectedEnvironmentId) ??
    environmentList?.find((environment) => environment.isPrimary) ??
    environmentList?.[0];
  const token = selectedEnvironment?.token ?? 'USERTOUR_TOKEN';

  const isSelfHosted = globalConfig?.isSelfHostedMode ?? false;
  const apiUrl = globalConfig?.apiUrl ?? '';
  const envVarsBlock = isSelfHosted && apiUrl ? buildSelfHostedEnvVars(apiUrl) : undefined;

  const copiedMessage = t('settings.installation.copied');
  const npmCode = buildNpmCode(token);
  const htmlCode = buildHtmlCode(token, envVarsBlock);

  return (
    <SettingsCardStack>
      <SettingsCard>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex h-10 flex-row items-center">
              <h3 className="text-xl font-medium tracking-tight">
                {t('settings.installation.title')}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('settings.installation.description')}{' '}
              <a
                href={INSTALL_DOCS_HREF}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {t('settings.installation.docsLink')}
              </a>
            </p>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label>{t('settings.installation.environmentLabel')}</Label>
            <Select value={selectedEnvironment?.id} onValueChange={setSelectedEnvironmentId}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {environmentList?.map((environment) => (
                  <SelectItem key={environment.id} value={environment.id}>
                    {environment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t('settings.installation.tokenLabel')}</Label>
            <CopyableInput value={token} copiedMessage={copiedMessage} />
            <p className="text-xs text-muted-foreground">{t('settings.installation.tokenHelp')}</p>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <div className="space-y-4">
          <Tabs defaultValue="npm">
            <TabsList>
              <TabsTrigger value="npm" className="gap-1.5">
                <RiNpmjsFill className="h-4 w-4" />
                {t('settings.installation.npm.tabLabel')}
              </TabsTrigger>
              <TabsTrigger value="html" className="gap-1.5">
                <RiJavascriptFill className="h-4 w-4" />
                {t('settings.installation.html.tabLabel')}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="npm"
              forceMount
              className="mt-4 space-y-4 data-[state=inactive]:hidden"
            >
              <p className="text-sm text-muted-foreground">
                {t('settings.installation.npm.description')}
              </p>
              <div className="grid gap-2">
                <Label>{t('settings.installation.installLabel')}</Label>
                <CopyableInput value={NPM_INSTALL_COMMAND} copiedMessage={copiedMessage} />
              </div>
              <CodeBlock code={npmCode} language="javascript" copiedMessage={copiedMessage} />
            </TabsContent>

            <TabsContent
              value="html"
              forceMount
              className="mt-4 space-y-4 data-[state=inactive]:hidden"
            >
              <p className="text-sm text-muted-foreground">
                {t('settings.installation.html.description')}
              </p>
              <CodeBlock code={htmlCode} language="html" copiedMessage={copiedMessage} />
            </TabsContent>
          </Tabs>

          <InlineAlert variant="info" message={t('settings.installation.placeholderNote')} />
          <VerifyInstallation environmentId={selectedEnvironment?.id} />
        </div>
      </SettingsCard>
    </SettingsCardStack>
  );
};

SettingsInstallation.displayName = 'SettingsInstallation';
