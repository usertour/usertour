'use client';

import { BUILDER_Z } from '@usertour/constants';
import {
  Button,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CompactSelect,
  ScrollArea,
  Switch,
  Label,
} from '@usertour/ui';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { RiArrowLeftSLine, SpinnerIcon } from '@usertour/icons';
import { Callout } from '@/pages/contents/components/builder/shared/callout';
import { PopperEditorMini, CodeEditor } from '@usertour/editor';
import type { Descendant } from '@usertour/editor';
import { Conditions } from '@usertour/business-components';
import { useListEventsQuery, useSegmentListQuery } from '@usertour/hooks';
import { Trans, useTranslation } from 'react-i18next';
import {
  LauncherIconSource,
  LiveChatProvider,
  ResourceCenterBlockType,
  RulesCondition,
} from '@usertour/types';
import { isRichTextEmpty } from '@usertour/helpers';
import { useEnvironmentId, useProjectId } from '@/pages/contents/components/builder/core';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import { useConditionsSaveGate } from '@/pages/contents/components/builder/hooks/use-conditions-save-gate';
import { useToken } from '@/pages/contents/components/builder/hooks/use-token';
import { FloatingSidebarPanel } from '@/pages/contents/components/builder/components/sidebar';
import { IconPicker } from '@/pages/contents/components/builder/components/icon-picker';
import {
  ContentError,
  ContentErrorAnchor,
  ContentErrorContent,
} from '@/pages/contents/components/builder/components/content-error';

// Provider display names are brand names — kept verbatim, not translated.
const LIVE_CHAT_PROVIDER_OPTIONS = [
  { value: LiveChatProvider.CRISP, label: 'Crisp' },
  { value: LiveChatProvider.FRESHCHAT, label: 'Freshchat' },
  { value: LiveChatProvider.HELP_SCOUT, label: 'Help Scout' },
  { value: LiveChatProvider.HUBSPOT, label: 'HubSpot' },
  { value: LiveChatProvider.INTERCOM, label: 'Intercom' },
  { value: LiveChatProvider.ZENDESK_CLASSIC, label: 'Zendesk Classic' },
  { value: LiveChatProvider.ZENDESK_MESSENGER, label: 'Zendesk Messenger' },
  { value: LiveChatProvider.CUSTOM, label: 'Custom' },
];

const I18N_PREFIX = 'contentBuilder.resourceCenter.liveChat';

// i18n key per provider for the (plain text) behavior description.
const PROVIDER_DESCRIPTION_KEYS: Partial<Record<LiveChatProvider, string>> = {
  [LiveChatProvider.CRISP]: `${I18N_PREFIX}.descriptions.crisp`,
  [LiveChatProvider.FRESHCHAT]: `${I18N_PREFIX}.descriptions.freshchat`,
  [LiveChatProvider.HELP_SCOUT]: `${I18N_PREFIX}.descriptions.helpScout`,
  [LiveChatProvider.HUBSPOT]: `${I18N_PREFIX}.descriptions.hubspot`,
  [LiveChatProvider.INTERCOM]: `${I18N_PREFIX}.descriptions.intercom`,
  [LiveChatProvider.ZENDESK_CLASSIC]: `${I18N_PREFIX}.descriptions.zendeskClassic`,
  [LiveChatProvider.ZENDESK_MESSENGER]: `${I18N_PREFIX}.descriptions.zendeskMessenger`,
  [LiveChatProvider.CUSTOM]: `${I18N_PREFIX}.descriptions.custom`,
};

// i18n key per provider for an extra setup note (rich text, rendered via Trans).
const PROVIDER_NOTE_KEYS: Partial<Record<LiveChatProvider, string>> = {
  [LiveChatProvider.ZENDESK_MESSENGER]: `${I18N_PREFIX}.notes.zendeskMessenger`,
};

// A flash-prevention tip: an i18n key for the (rich text) explanation plus an
// optional literal code snippet to paste — the snippet is code, never translated.
interface ProviderFlashWarning {
  textKey: string;
  code?: string;
}

const PROVIDER_FLASH_WARNINGS: Partial<Record<LiveChatProvider, ProviderFlashWarning>> = {
  [LiveChatProvider.CRISP]: {
    textKey: `${I18N_PREFIX}.flashWarnings.crisp`,
    code: `<script>\n  $crisp.push(['do', 'chat:hide'])\n</script>`,
  },
  [LiveChatProvider.FRESHCHAT]: {
    textKey: `${I18N_PREFIX}.flashWarnings.freshchat`,
    code: 'window.fcWidget.init({\n  // ...other settings\n  config: {\n    headerProperty: {\n      hideChatButton: true\n    }\n  }\n});',
  },
  [LiveChatProvider.HELP_SCOUT]: {
    textKey: `${I18N_PREFIX}.flashWarnings.helpScout`,
  },
  [LiveChatProvider.HUBSPOT]: {
    textKey: `${I18N_PREFIX}.flashWarnings.hubspot`,
    code: '<style>\n#hubspot-messages-iframe-container {\n  visibility: hidden;\n}\n</style>',
  },
  [LiveChatProvider.INTERCOM]: {
    textKey: `${I18N_PREFIX}.flashWarnings.intercom`,
    code: 'window.intercomSettings = {\n  // ...other settings\n  hide_default_launcher: true\n};',
  },
  [LiveChatProvider.ZENDESK_CLASSIC]: {
    textKey: `${I18N_PREFIX}.flashWarnings.zendeskClassic`,
    code: `<script type="text/javascript">\n  zE('webWidget', 'hide');\n</script>`,
  },
};

const BlockLiveChatHeader = () => {
  const { setCurrentBlock, exitBlock } = useResourceCenterEditor();
  const { t } = useTranslation();
  return (
    <CardHeader className="flex-none border-b border-border/50 px-5 py-4">
      <CardTitle className="flex flex-row items-center space-x-1 text-base font-medium pr-16">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setCurrentBlock(null);
            exitBlock();
          }}
          className="mr-1.5 size-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RiArrowLeftSLine className="h-5 w-5" />
        </Button>
        <span className="truncate">{t(`${I18N_PREFIX}.block`)}</span>
      </CardTitle>
    </CardHeader>
  );
};

const BlockLiveChatBody = () => {
  const { currentBlock, setCurrentBlock, isShowError } = useResourceCenterEditor();
  const { attributeList } = useAttributeList();
  const environmentId = useEnvironmentId();
  const projectId = useProjectId();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);
  const { t } = useTranslation();

  if (!currentBlock || currentBlock.type !== ResourceCenterBlockType.LIVE_CHAT) {
    return null;
  }

  const handleNameChange = (value: Descendant[]) => {
    setCurrentBlock((prev) => (prev ? ({ ...prev, name: value } as typeof prev) : null));
  };

  const handleCustomCodeChange = (value: string) => {
    setCurrentBlock((prev) => (prev ? { ...prev, customLiveChatCode: value } : null));
  };

  const handleIconChange = (updates: {
    iconType?: string;
    iconSource?: LauncherIconSource;
    iconUrl?: string;
  }) => {
    setCurrentBlock((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ...(updates.iconType !== undefined && { iconType: updates.iconType }),
        ...(updates.iconSource !== undefined && { iconSource: updates.iconSource }),
        ...(updates.iconUrl !== undefined ? { iconUrl: updates.iconUrl } : { iconUrl: undefined }),
      };
    });
  };

  const handleProviderChange = (value: string) => {
    setCurrentBlock((prev) =>
      prev ? { ...prev, liveChatProvider: value as LiveChatProvider } : null,
    );
  };

  const handleOnlyShowChange = (value: boolean) => {
    setCurrentBlock((prev) => (prev ? { ...prev, onlyShowBlock: value } : null));
  };

  const handleConditionsChange = (value: RulesCondition[]) => {
    setCurrentBlock((prev) => (prev ? { ...prev, onlyShowBlockConditions: value } : null));
  };

  const descriptionKey = PROVIDER_DESCRIPTION_KEYS[currentBlock.liveChatProvider];
  const noteKey = PROVIDER_NOTE_KEYS[currentBlock.liveChatProvider];
  const flashWarning = PROVIDER_FLASH_WARNINGS[currentBlock.liveChatProvider];

  return (
    <CardContent className="grow overflow-hidden p-0">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          {/* Icon */}
          <div className="flex flex-col space-y-2">
            <Label>{t('contentBuilder.resourceCenter.icon')}</Label>
            <IconPicker
              type={currentBlock.iconType}
              iconSource={currentBlock.iconSource}
              iconUrl={currentBlock.iconUrl}
              zIndex={BUILDER_Z.popover}
              showNoIcon={true}
              onChange={handleIconChange}
            />
          </div>

          {/* Name */}
          <ContentError open={isShowError && isRichTextEmpty(currentBlock.name)}>
            <div className="flex flex-col space-y-2">
              <Label>{t('contentBuilder.resourceCenter.name')}</Label>
              <ContentErrorAnchor>
                <PopperEditorMini
                  className="bg-surface dark:bg-surface-raised/50 text-sm shadow-none rounded-lg"
                  zIndex={BUILDER_Z.popover}
                  initialValue={
                    (currentBlock.name as Descendant[]) ?? [
                      { type: 'paragraph', children: [{ text: '' }] },
                    ]
                  }
                  onValueChange={handleNameChange}
                  attributes={attributeList}
                />
              </ContentErrorAnchor>
            </div>
            <ContentErrorContent style={{ zIndex: BUILDER_Z.popover }}>
              {t('contentBuilder.resourceCenter.nameRequired')}
            </ContentErrorContent>
          </ContentError>

          {/* Live chat provider */}
          <div className="flex flex-col space-y-2">
            <Label>{t(`${I18N_PREFIX}.provider`)}</Label>
            <CompactSelect
              options={LIVE_CHAT_PROVIDER_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={currentBlock.liveChatProvider}
              onChange={handleProviderChange}
              placeholder={t(`${I18N_PREFIX}.selectProvider`)}
              className="w-full bg-surface dark:bg-surface-raised/50 shadow-none"
              contentStyle={{ zIndex: BUILDER_Z.popover }}
            />
          </div>

          {/* Provider description */}
          {descriptionKey && <Callout variant="info">{t(descriptionKey)}</Callout>}

          {/* Provider note (extra setup, e.g. Zendesk Messenger config) */}
          {noteKey && (
            <Callout variant="info">
              <Trans i18nKey={noteKey} components={{ strong: <strong /> }} />
            </Callout>
          )}

          {/* Flash warning */}
          {flashWarning && (
            <Callout variant="warning">
              <div>
                <Trans
                  i18nKey={flashWarning.textKey}
                  components={{
                    strong: <strong />,
                    code: <code className="rounded bg-muted px-1" />,
                  }}
                />
              </div>
              {flashWarning.code && (
                <pre className="mt-2 rounded border border-border bg-surface dark:bg-surface-raised/50 p-2 text-xs text-foreground whitespace-pre-wrap break-all">
                  <code>{flashWarning.code}</code>
                </pre>
              )}
            </Callout>
          )}

          {/* Custom code (only for custom provider) */}
          {currentBlock.liveChatProvider === LiveChatProvider.CUSTOM && (
            <ContentError
              open={isShowError && (currentBlock.customLiveChatCode ?? '').trim() === ''}
            >
              <div className="flex flex-col space-y-2">
                <Label>{t(`${I18N_PREFIX}.customCode`)}</Label>
                <ContentErrorAnchor>
                  <CodeEditor
                    value={currentBlock.customLiveChatCode ?? ''}
                    onChange={handleCustomCodeChange}
                  />
                </ContentErrorAnchor>
                <p className="text-xs text-muted-foreground">
                  {t(`${I18N_PREFIX}.customCodeHint`)}
                </p>
              </div>
              <ContentErrorContent style={{ zIndex: BUILDER_Z.popover }}>
                {t(`${I18N_PREFIX}.customCodeRequired`)}
              </ContentErrorContent>
            </ContentError>
          )}

          {/* Only show block if... */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="only-show-block" className="font-normal">
                {t('contentBuilder.resourceCenter.onlyShowBlock')}
              </Label>
              <Switch
                id="only-show-block"
                className="data-[state=unchecked]:bg-input"
                checked={currentBlock.onlyShowBlock}
                onCheckedChange={handleOnlyShowChange}
              />
            </div>
            {currentBlock.onlyShowBlock && (
              <Conditions
                onChange={handleConditionsChange}
                conditions={currentBlock.onlyShowBlockConditions ?? []}
                attributes={attributeList}
                contents={[]}
                segments={segmentList}
                events={eventList}
                token={token}
                baseZIndex={BUILDER_Z.rules}
                t={t}
              />
            )}
          </div>
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const BlockLiveChatFooter = () => {
  const { saveCurrentBlock, currentBlock, isLoading } = useResourceCenterEditor();
  const { t } = useTranslation();
  const gate = useConditionsSaveGate();
  const handleSave = () => {
    if (!gate(currentBlock?.onlyShowBlockConditions)) return;
    saveCurrentBlock();
  };
  return (
    <CardFooter className="flex-none border-t border-border/50 p-4">
      <Button className="w-full h-10" disabled={isLoading} onClick={handleSave}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        {t('contentBuilder.common.save')}
      </Button>
    </CardFooter>
  );
};

export const ResourceCenterBlockLiveChat = () => {
  return (
    <FloatingSidebarPanel width={320}>
      <BlockLiveChatHeader />
      <BlockLiveChatBody />
      <BlockLiveChatFooter />
    </FloatingSidebarPanel>
  );
};

ResourceCenterBlockLiveChat.displayName = 'ResourceCenterBlockLiveChat';
