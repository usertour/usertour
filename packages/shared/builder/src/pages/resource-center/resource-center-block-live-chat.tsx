'use client';

import { ChevronLeftIcon, InfoCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { EXTENSION_CONTENT_RULES, EXTENSION_SELECT } from '@usertour-packages/constants';
import { useAttributeListContext } from '@usertour-packages/contexts';
import { SpinnerIcon } from '@usertour-packages/icons';
import { PopperEditorMini, CodeEditor } from '@usertour-packages/shared-editor';
import type { Descendant } from '@usertour-packages/shared-editor';
import { Label } from '@usertour-packages/label';
import { ScrollArea } from '@usertour-packages/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { Rules } from '@usertour-packages/shared-components';
import { useListEventsQuery, useSegmentListQuery } from '@usertour-packages/shared-hooks';
import { Switch } from '@usertour-packages/switch';
import {
  LauncherIconSource,
  LiveChatProvider,
  ResourceCenterBlockType,
  RulesCondition,
} from '@usertour/types';
import { isRichTextEmpty } from '@usertour/helpers';
import type { ReactNode } from 'react';
import { BuilderMode, useBuilderContext, useResourceCenterContext } from '../../contexts';
import { useToken } from '../../hooks/use-token';
import { SidebarContainer } from '../sidebar';
import { IconPicker } from '../../components/icon-picker';
import {
  ContentError,
  ContentErrorAnchor,
  ContentErrorContent,
} from '../../components/content-error';

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

const PROVIDER_DESCRIPTIONS: Partial<Record<LiveChatProvider, string>> = {
  [LiveChatProvider.CRISP]:
    "Crisp's default launcher will be hidden automatically. When the user clicks this block, the resource center will close and the Crisp chat window will open. The resource center will reappear once the user closes the chat.",
  [LiveChatProvider.FRESHCHAT]:
    "Freshchat's default chat button will be hidden automatically. When the user clicks this block, the resource center will close and Freshchat will open. The resource center will reappear once the user closes the chat.",
  [LiveChatProvider.HELP_SCOUT]:
    "Help Scout Beacon's default launcher will be hidden automatically. When the user clicks this block, the resource center will close and Help Scout Beacon will open. The resource center will reappear once the user closes the Beacon.",
  [LiveChatProvider.HUBSPOT]:
    "HubSpot's default chat widget will be hidden automatically. When the user clicks this block, the resource center will close and the HubSpot chat widget will open. The resource center will reappear once the user closes the chat.",
  [LiveChatProvider.INTERCOM]:
    "Intercom's default Messenger launcher will be hidden automatically. When the user clicks this block, the resource center will close and Intercom Messenger will open. The resource center will reappear once the user closes the Messenger.",
  [LiveChatProvider.ZENDESK_CLASSIC]:
    "Zendesk Classic's default launcher will be hidden automatically. When the user clicks this block, the resource center will close and the Zendesk Classic widget will open. The resource center will reappear once the user closes the widget.",
  [LiveChatProvider.ZENDESK_MESSENGER]:
    "Zendesk Messenger's default launcher will be hidden automatically. When the user clicks this block, the resource center will close and Zendesk Messenger will open. The resource center will reappear once the user closes the Messenger.",
  [LiveChatProvider.CUSTOM]:
    'When the user clicks this block, the custom JavaScript code below will be executed. Use it to open your live chat messenger.',
};

const PROVIDER_NOTES: Partial<Record<LiveChatProvider, ReactNode>> = {
  [LiveChatProvider.ZENDESK_MESSENGER]: (
    <>
      You also need to disable the built-in Web Widget launcher manually. Go to{' '}
      <strong>Settings &rarr; Channels &rarr; Messaging &rarr; Your messenger &rarr; Style</strong>{' '}
      and set <strong>Shape</strong> to <strong>Custom launcher</strong>. It may take a few minutes
      to take effect.
    </>
  ),
};

interface ProviderFlashWarning {
  text: ReactNode;
  code?: string;
}

const PROVIDER_FLASH_WARNINGS: Partial<Record<LiveChatProvider, ProviderFlashWarning>> = {
  [LiveChatProvider.CRISP]: {
    text: 'The Crisp launcher may briefly flash on screen if Crisp loads before Usertour. To prevent this, add the following right after your Crisp installation snippet:',
    code: `<script>\n  $crisp.push(['do', 'chat:hide'])\n</script>`,
  },
  [LiveChatProvider.FRESHCHAT]: {
    text: (
      <>
        <strong>Important:</strong> Freshchat shows its chat button by default. You need to disable
        it in your Freshchat installation snippet by setting{' '}
        <code className="rounded bg-yellow-100 px-1">hideChatButton: true</code>:
      </>
    ),
    code: 'window.fcWidget.init({\n  // ...other settings\n  config: {\n    headerProperty: {\n      hideChatButton: true\n    }\n  }\n});',
  },
  [LiveChatProvider.HELP_SCOUT]: {
    text: (
      <>
        The Help Scout launcher may briefly flash on screen if Help Scout loads before Usertour. To
        prevent this, set <strong>Button style</strong> to <strong>Hidden</strong> in your Help
        Scout account under <strong>Settings &rarr; Beacons &rarr; Your beacon</strong>.
      </>
    ),
  },
  [LiveChatProvider.HUBSPOT]: {
    text: 'The HubSpot chat widget may briefly flash on screen if HubSpot loads before Usertour. To prevent this, add the following to your page:',
    code: '<style>\n#hubspot-messages-iframe-container {\n  visibility: hidden;\n}\n</style>',
  },
  [LiveChatProvider.INTERCOM]: {
    text: 'The Intercom launcher may briefly flash on screen if Intercom loads before Usertour. To prevent this, add the following to your Intercom snippet:',
    code: 'window.intercomSettings = {\n  // ...other settings\n  hide_default_launcher: true\n};',
  },
  [LiveChatProvider.ZENDESK_CLASSIC]: {
    text: 'The Zendesk Classic launcher may briefly flash on screen if it loads before Usertour. To prevent this, add the following right after your Zendesk embed code:',
    code: `<script type="text/javascript">\n  zE('webWidget', 'hide');\n</script>`,
  },
};

const BlockLiveChatHeader = () => {
  const { setCurrentMode } = useBuilderContext();
  const { setCurrentBlock } = useResourceCenterContext();
  return (
    <CardHeader className="flex-none p-4 space-y-2">
      <CardTitle className="flex flex-row space-x-1 text-base items-center">
        <Button
          variant="link"
          size="icon"
          onClick={() => {
            setCurrentBlock(null);
            setCurrentMode({ mode: BuilderMode.RESOURCE_CENTER });
          }}
          className="text-foreground w-6 h-8"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </Button>
        <span className="truncate">Live chat block</span>
      </CardTitle>
    </CardHeader>
  );
};

const BlockLiveChatBody = () => {
  const { currentBlock, setCurrentBlock, zIndex, isShowError } = useResourceCenterContext();
  const { attributeList } = useAttributeListContext();
  const { environmentId, projectId } = useBuilderContext();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);

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

  const description = PROVIDER_DESCRIPTIONS[currentBlock.liveChatProvider];
  const flashWarning = PROVIDER_FLASH_WARNINGS[currentBlock.liveChatProvider];

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          {/* Icon */}
          <div className="flex flex-col space-y-2">
            <Label>Icon</Label>
            <IconPicker
              type={currentBlock.iconType}
              iconSource={currentBlock.iconSource}
              iconUrl={currentBlock.iconUrl}
              zIndex={zIndex + EXTENSION_SELECT}
              showNoIcon={true}
              onChange={handleIconChange}
            />
          </div>

          {/* Name */}
          <ContentError open={isShowError && isRichTextEmpty(currentBlock.name)}>
            <div className="flex flex-col space-y-2">
              <Label>Name</Label>
              <ContentErrorAnchor>
                <PopperEditorMini
                  zIndex={zIndex + EXTENSION_SELECT}
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
            <ContentErrorContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
              Name is required
            </ContentErrorContent>
          </ContentError>

          {/* Live chat provider */}
          <div className="flex flex-col space-y-2">
            <Label>Live chat provider</Label>
            <Select value={currentBlock.liveChatProvider} onValueChange={handleProviderChange}>
              <SelectTrigger className="bg-background-900">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
                {LIVE_CHAT_PROVIDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Provider description */}
          {description && (
            <div className="flex items-start space-x-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <InfoCircledIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <p className="text-sm text-blue-800">{description}</p>
            </div>
          )}

          {/* Provider note (blue info, e.g. Zendesk Messenger config) */}
          {PROVIDER_NOTES[currentBlock.liveChatProvider] && (
            <div className="flex items-start space-x-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <InfoCircledIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <div className="text-sm text-blue-800">
                {PROVIDER_NOTES[currentBlock.liveChatProvider]}
              </div>
            </div>
          )}

          {/* Flash warning */}
          {flashWarning && (
            <div className="flex items-start space-x-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 min-w-0">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
              <div className="text-sm text-yellow-800 min-w-0">
                <div>{flashWarning.text}</div>
                {flashWarning.code && (
                  <pre className="mt-2 rounded bg-white/80 border border-yellow-200 p-2 text-xs text-foreground whitespace-pre-wrap break-all">
                    <code>{flashWarning.code}</code>
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Custom code (only for custom provider) */}
          {currentBlock.liveChatProvider === LiveChatProvider.CUSTOM && (
            <ContentError
              open={isShowError && (currentBlock.customLiveChatCode ?? '').trim() === ''}
            >
              <div className="flex flex-col space-y-2">
                <Label>Custom JavaScript code</Label>
                <ContentErrorAnchor>
                  <CodeEditor
                    value={currentBlock.customLiveChatCode ?? ''}
                    onChange={handleCustomCodeChange}
                  />
                </ContentErrorAnchor>
                <p className="text-xs text-muted-foreground">
                  This JavaScript code will be executed when the user clicks the block.
                </p>
              </div>
              <ContentErrorContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
                Custom JavaScript code is required
              </ContentErrorContent>
            </ContentError>
          )}

          {/* Only show block if... */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="only-show-block" className="font-normal">
                Only show block if...
              </Label>
              <Switch
                id="only-show-block"
                className="data-[state=unchecked]:bg-input"
                checked={currentBlock.onlyShowBlock}
                onCheckedChange={handleOnlyShowChange}
              />
            </div>
            {currentBlock.onlyShowBlock && (
              <Rules
                onDataChange={handleConditionsChange}
                defaultConditions={currentBlock.onlyShowBlockConditions ?? []}
                attributes={attributeList}
                contents={[]}
                segments={segmentList}
                events={eventList}
                token={token}
                baseZIndex={EXTENSION_CONTENT_RULES}
              />
            )}
          </div>
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const BlockLiveChatFooter = () => {
  const { saveCurrentBlock, isLoading } = useResourceCenterContext();
  return (
    <CardFooter className="flex-none p-5">
      <Button className="w-full h-10" disabled={isLoading} onClick={saveCurrentBlock}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        Save
      </Button>
    </CardFooter>
  );
};

export const ResourceCenterBlockLiveChat = () => {
  return (
    <SidebarContainer>
      <BlockLiveChatHeader />
      <BlockLiveChatBody />
      <BlockLiveChatFooter />
    </SidebarContainer>
  );
};

ResourceCenterBlockLiveChat.displayName = 'ResourceCenterBlockLiveChat';
