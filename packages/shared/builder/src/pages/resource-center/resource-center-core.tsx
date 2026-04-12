'use client';

import { PlusCircledIcon } from '@radix-ui/react-icons';
import { CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { EXTENSION_SELECT } from '@usertour-packages/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { Button } from '@usertour-packages/button';
import {
  ContentEditorRoot,
  KnowledgeBaseSearchProvider,
  LauncherIconSource,
  LiveChatProvider,
  ResourceCenterBlockType,
} from '@usertour/types';
import { uuidV4 } from '@usertour/helpers';
import { useBuilderContext, useResourceCenterContext } from '../../contexts';
import { SidebarContainer } from '../sidebar';
import { SidebarFooter } from '../sidebar/sidebar-footer';
import { SidebarHeader } from '../sidebar/sidebar-header';
import { SidebarTheme } from '../sidebar/sidebar-theme';
import { ResourceCenterBlocks } from './components/resource-center-blocks';
import { ResourceCenterTabs } from './components/resource-center-tabs';
import { BLOCK_TYPE_OPTIONS } from './resource-center-block-options';
import type { ResourceCenterBlock } from '@usertour/types';
const labelStyles = 'flex justify-start items-center space-x-1';

const DEFAULT_MESSAGE_BLOCK_CONTENT = [
  {
    element: { type: 'group' },
    children: [
      {
        element: {
          type: 'column',
          style: {},
          width: { type: 'fill' },
          justifyContent: 'justify-start',
        },
        children: [
          {
            element: {
              data: [{ type: 'paragraph', children: [{ text: '' }] }],
              type: 'text',
            },
          },
        ],
      },
    ],
  },
] as ContentEditorRoot[];

const createBlock = (type: ResourceCenterBlockType): ResourceCenterBlock | null => {
  const id = uuidV4();
  switch (type) {
    case ResourceCenterBlockType.MESSAGE:
      return {
        id,
        type: ResourceCenterBlockType.MESSAGE,
        content: DEFAULT_MESSAGE_BLOCK_CONTENT,
        onlyShowBlock: false,
        onlyShowBlockConditions: [],
      };
    case ResourceCenterBlockType.CHECKLIST:
      return {
        id,
        type: ResourceCenterBlockType.CHECKLIST,
        onlyShowBlock: false,
        onlyShowBlockConditions: [],
      };
    case ResourceCenterBlockType.DIVIDER:
      return {
        id,
        type: ResourceCenterBlockType.DIVIDER,
        onlyShowBlock: false,
        onlyShowBlockConditions: [],
      };
    case ResourceCenterBlockType.ACTION:
      return {
        id,
        type: ResourceCenterBlockType.ACTION,
        name: [{ type: 'paragraph', children: [{ text: '' }] }],
        iconSource: LauncherIconSource.BUILTIN,
        iconType: 'arrow-right-circle-fill',
        clickedActions: [],
        onlyShowBlock: false,
        onlyShowBlockConditions: [],
      };
    case ResourceCenterBlockType.SUB_PAGE:
      return {
        id,
        type: ResourceCenterBlockType.SUB_PAGE,
        name: [{ type: 'paragraph', children: [{ text: '' }] }],
        iconSource: LauncherIconSource.BUILTIN,
        iconType: 'pages-fill',
        content: DEFAULT_MESSAGE_BLOCK_CONTENT,
        onlyShowBlock: false,
        onlyShowBlockConditions: [],
      };
    case ResourceCenterBlockType.KNOWLEDGE_BASE:
      return {
        id,
        type: ResourceCenterBlockType.KNOWLEDGE_BASE,
        name: [{ type: 'paragraph', children: [{ text: 'Knowledge base' }] }],
        iconSource: LauncherIconSource.BUILTIN,
        iconType: 'book-open-fill',
        searchProvider: KnowledgeBaseSearchProvider.FRESHDESK,
        knowledgeBaseUrl: '',
        defaultSearchQuery: '',
        onlyShowBlock: false,
        onlyShowBlockConditions: [],
      };
    case ResourceCenterBlockType.CONTENT_LIST:
      return {
        id,
        type: ResourceCenterBlockType.CONTENT_LIST,
        name: [{ type: 'paragraph', children: [{ text: 'Guided tours' }] }],
        iconSource: LauncherIconSource.BUILTIN,
        iconType: 'list-check3',
        flowIconSource: LauncherIconSource.BUILTIN,
        flowIconType: 'flow-icon',
        checklistIconSource: LauncherIconSource.BUILTIN,
        checklistIconType: 'checklist-icon',
        showSearchField: true,
        contentItems: [],
        onlyShowBlock: false,
        onlyShowBlockConditions: [],
      };
    case ResourceCenterBlockType.LIVE_CHAT:
      return {
        id,
        type: ResourceCenterBlockType.LIVE_CHAT,
        name: [{ type: 'paragraph', children: [{ text: 'Ask a question' }] }],
        iconSource: LauncherIconSource.BUILTIN,
        iconType: 'message3-fill',
        liveChatProvider: LiveChatProvider.CRISP,
        customLiveChatCode: '',
        onlyShowBlock: false,
        onlyShowBlockConditions: [],
      };
    default:
      return null;
  }
};

const ResourceCenterCoreBody = () => {
  const { localData, zIndex, addBlock, updateLocalData, currentTabId } = useResourceCenterContext();

  if (!localData) {
    return null;
  }

  const currentTab = localData.tabs.find((t) => t.id === currentTabId);

  const handleAddBlock = (type: ResourceCenterBlockType) => {
    const block = createBlock(type);
    if (block) {
      addBlock(block);
    }
  };

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <SidebarTheme />

          {/* Header Text */}
          <div className="flex flex-col space-y-2">
            <div className={labelStyles}>
              <Label htmlFor="header-text">Header text</Label>
            </div>
            <Input
              className="bg-background-900"
              id="header-text"
              value={localData.headerText}
              onChange={(e) => {
                updateLocalData({ headerText: e.target.value });
              }}
              placeholder="Resource Center"
            />
          </div>

          {/* Launcher Button Text */}
          <div className="flex flex-col space-y-2">
            <div className={labelStyles}>
              <Label htmlFor="launcher-button-text">Launcher button text</Label>
            </div>
            <Input
              className="bg-background-900"
              id="launcher-button-text"
              value={localData.buttonText}
              onChange={(e) => {
                updateLocalData({ buttonText: e.target.value });
              }}
              placeholder="None"
            />
          </div>

          <ResourceCenterTabs />

          {currentTab && (
            <>
              <ResourceCenterBlocks />

              {/* Add Block */}
              <div>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button className="w-full" variant="secondary">
                      <PlusCircledIcon className="mr-2" />
                      Add block
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={6}
                    className="min-w-[280px]"
                    style={{ zIndex: zIndex + EXTENSION_SELECT }}
                  >
                    {BLOCK_TYPE_OPTIONS.map(
                      ({ key, value, label, description, icon: Icon, disabled }) => {
                        return (
                          <DropdownMenuItem
                            key={key}
                            disabled={disabled}
                            className="cursor-pointer min-w-[220px] gap-2 py-1.5 text-xs"
                            onSelect={() => value && handleAddBlock(value)}
                          >
                            <Icon width={16} height={16} className="shrink-0 text-foreground" />
                            <span className="min-w-0 leading-none">
                              <span className="text-xs font-medium text-foreground">{label}</span>
                              <span className="ml-1 text-xs text-muted-foreground">
                                {description}
                              </span>
                            </span>
                          </DropdownMenuItem>
                        );
                      },
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const ResourceCenterCoreHeader = () => {
  const { currentContent } = useBuilderContext();
  return (
    <CardHeader className="flex-none p-4 space-y-3">
      <CardTitle className="flex h-8">
        <SidebarHeader title={currentContent?.name ?? ''} />
      </CardTitle>
    </CardHeader>
  );
};

const ResourceCenterCoreFooter = () => {
  const { isLoading, onSaved } = useBuilderContext();
  const { flushSave } = useResourceCenterContext();

  const handleSave = async () => {
    await flushSave();
    await onSaved?.();
  };

  return (
    <CardFooter className="flex p-5">
      <SidebarFooter onSave={handleSave} isLoading={isLoading} />
    </CardFooter>
  );
};

export const ResourceCenterCore = () => {
  return (
    <SidebarContainer>
      <ResourceCenterCoreHeader />
      <ResourceCenterCoreBody />
      <ResourceCenterCoreFooter />
    </SidebarContainer>
  );
};

ResourceCenterCore.displayName = 'ResourceCenterCore';
