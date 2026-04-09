'use client';

import { ChevronLeftIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { EXTENSION_CONTENT_RULES, EXTENSION_SELECT } from '@usertour-packages/constants';
import { useAttributeListContext } from '@usertour-packages/contexts';
import { SpinnerIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
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
import { Textarea } from '@usertour-packages/textarea';
import {
  LauncherIconSource,
  LiveChatProvider,
  ResourceCenterBlockType,
  RulesCondition,
} from '@usertour/types';
import { BuilderMode, useBuilderContext, useResourceCenterContext } from '../../contexts';
import { useToken } from '../../hooks/use-token';
import { SidebarContainer } from '../sidebar';
import { IconPicker } from '../../components/icon-picker';

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

const PROVIDER_HINTS: Partial<Record<LiveChatProvider, string>> = {
  [LiveChatProvider.CRISP]: 'Make sure the Crisp chat widget script is installed on your site.',
  [LiveChatProvider.FRESHCHAT]: 'Make sure the Freshchat widget script is installed on your site.',
  [LiveChatProvider.HELP_SCOUT]:
    'Make sure the Help Scout Beacon script is installed on your site.',
  [LiveChatProvider.HUBSPOT]: 'Make sure the HubSpot chat widget script is installed on your site.',
  [LiveChatProvider.INTERCOM]: 'Make sure the Intercom Messenger script is installed on your site.',
  [LiveChatProvider.ZENDESK_CLASSIC]:
    'Make sure the Zendesk Web Widget (Classic) script is installed on your site.',
  [LiveChatProvider.ZENDESK_MESSENGER]:
    'Make sure the Zendesk Messaging script is installed on your site.',
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
  const { currentBlock, setCurrentBlock, zIndex } = useResourceCenterContext();
  const { attributeList } = useAttributeListContext();
  const { environmentId, projectId } = useBuilderContext();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);

  if (!currentBlock || currentBlock.type !== ResourceCenterBlockType.LIVE_CHAT) {
    return null;
  }

  const handleInputChange =
    (field: 'name' | 'customLiveChatCode') =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setCurrentBlock((prev) => (prev ? { ...prev, [field]: e.target.value } : null));
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

  const hint = PROVIDER_HINTS[currentBlock.liveChatProvider];

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
          <div className="flex flex-col space-y-2">
            <Label htmlFor="live-chat-block-name">Name</Label>
            <Input
              id="live-chat-block-name"
              className="bg-background-900"
              value={currentBlock.name}
              placeholder="None"
              onChange={handleInputChange('name')}
            />
          </div>

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
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>

          {/* Custom code (only for custom provider) */}
          {currentBlock.liveChatProvider === LiveChatProvider.CUSTOM && (
            <div className="flex flex-col space-y-2">
              <Label htmlFor="live-chat-custom-code">Custom JavaScript code</Label>
              <Textarea
                id="live-chat-custom-code"
                className="bg-background-900 font-mono text-xs min-h-[100px]"
                value={currentBlock.customLiveChatCode}
                placeholder="// Code to open your live chat widget"
                onChange={handleInputChange('customLiveChatCode')}
              />
              <p className="text-xs text-muted-foreground">
                This JavaScript code will be executed when the user clicks the block.
              </p>
            </div>
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
