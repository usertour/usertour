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
import {
  KnowledgeBaseSearchProvider,
  LauncherIconSource,
  ResourceCenterBlockType,
  RulesCondition,
} from '@usertour/types';
import { BuilderMode, useBuilderContext, useResourceCenterContext } from '../../contexts';
import { useToken } from '../../hooks/use-token';
import { SidebarContainer } from '../sidebar';
import { IconPicker } from '../../components/icon-picker';

const SEARCH_PROVIDER_OPTIONS = [
  {
    value: KnowledgeBaseSearchProvider.FRESHDESK,
    label: 'Freshdesk - Public search',
  },
  {
    value: KnowledgeBaseSearchProvider.GOOGLE,
    label: 'Google Search',
  },
  {
    value: KnowledgeBaseSearchProvider.HUBSPOT,
    label: 'HubSpot - Public search',
  },
  {
    value: KnowledgeBaseSearchProvider.ZENDESK,
    label: 'Zendesk - Public search',
  },
];

const BlockKnowledgeBaseHeader = () => {
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
        <span className="truncate">Knowledge base block</span>
      </CardTitle>
    </CardHeader>
  );
};

const BlockKnowledgeBaseBody = () => {
  const { currentBlock, setCurrentBlock, zIndex } = useResourceCenterContext();
  const { attributeList } = useAttributeListContext();
  const { environmentId, projectId } = useBuilderContext();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);

  if (!currentBlock || currentBlock.type !== ResourceCenterBlockType.KNOWLEDGE_BASE) {
    return null;
  }

  const handleInputChange =
    (field: 'name' | 'knowledgeBaseUrl' | 'defaultSearchQuery') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSearchProviderChange = (value: string) => {
    setCurrentBlock((prev) =>
      prev ? { ...prev, searchProvider: value as KnowledgeBaseSearchProvider } : null,
    );
  };

  const handleOnlyShowChange = (value: boolean) => {
    setCurrentBlock((prev) => (prev ? { ...prev, onlyShowTask: value } : null));
  };

  const handleConditionsChange = (value: RulesCondition[]) => {
    setCurrentBlock((prev) => (prev ? { ...prev, onlyShowTaskConditions: value } : null));
  };

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
            <Label htmlFor="kb-block-name">Name</Label>
            <Input
              id="kb-block-name"
              className="bg-background-900"
              value={currentBlock.name}
              placeholder="None"
              onChange={handleInputChange('name')}
            />
          </div>

          {/* Knowledge base search provider */}
          <div className="flex flex-col space-y-2">
            <Label>Knowledge base search provider</Label>
            <Select value={currentBlock.searchProvider} onValueChange={handleSearchProviderChange}>
              <SelectTrigger className="bg-background-900">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
                {SEARCH_PROVIDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Knowledge base URL */}
          <div className="flex flex-col space-y-2">
            <Label htmlFor="kb-url">Knowledge base URL</Label>
            <Input
              id="kb-url"
              className="bg-background-900"
              value={currentBlock.knowledgeBaseUrl}
              placeholder="Example: help.company.com/hc/en-us"
              onChange={handleInputChange('knowledgeBaseUrl')}
            />
          </div>

          {/* Default search query */}
          <div className="flex flex-col space-y-2">
            <Label htmlFor="kb-default-query">Default search query</Label>
            <Input
              id="kb-default-query"
              className="bg-background-900"
              value={currentBlock.defaultSearchQuery}
              placeholder="Default search query"
              onChange={handleInputChange('defaultSearchQuery')}
            />
          </div>

          {/* Only show block if... */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="only-show-block" className="font-normal">
                Only show block if...
              </Label>
              <Switch
                id="only-show-block"
                className="data-[state=unchecked]:bg-input"
                checked={currentBlock.onlyShowTask}
                onCheckedChange={handleOnlyShowChange}
              />
            </div>
            {currentBlock.onlyShowTask && (
              <Rules
                onDataChange={handleConditionsChange}
                defaultConditions={currentBlock.onlyShowTaskConditions ?? []}
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

const BlockKnowledgeBaseFooter = () => {
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

export const ResourceCenterBlockKnowledgeBase = () => {
  return (
    <SidebarContainer>
      <BlockKnowledgeBaseHeader />
      <BlockKnowledgeBaseBody />
      <BlockKnowledgeBaseFooter />
    </SidebarContainer>
  );
};

ResourceCenterBlockKnowledgeBase.displayName = 'ResourceCenterBlockKnowledgeBase';
