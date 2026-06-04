'use client';

import { RiAddCircleLine } from '@usertour/icons';
import {
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  ScrollArea,
  Button,
} from '@usertour/ui';
import { EXTENSION_SELECT } from '@usertour/constants';
import {
  ContentEditorRoot,
  LauncherIconSource,
  LiveChatProvider,
  ResourceCenterBlockType,
} from '@usertour/types';
import { uuidV4 } from '@usertour/helpers';
import { useTranslation } from 'react-i18next';
import { useBuilderConfig } from '@/pages/contents/components/builder/core';
import { useSidebarSave } from '@/pages/contents/components/builder/hooks/use-sidebar-save';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import { BuilderSidebarLayout } from '@/pages/contents/components/builder/components/sidebar/builder-sidebar-layout';
import { SidebarTheme } from '@/pages/contents/components/builder/components/sidebar/sidebar-theme';
import { ResourceCenterBlocks } from '@/pages/contents/components/builder/resource-center/components/resource-center-blocks';
import { ResourceCenterTabs } from '@/pages/contents/components/builder/resource-center/components/resource-center-tabs';
import { BLOCK_TYPE_OPTIONS } from '@/pages/contents/components/builder/resource-center/resource-center-block-options';
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
    case ResourceCenterBlockType.RICH_TEXT:
      return {
        id,
        type: ResourceCenterBlockType.RICH_TEXT,
        content: DEFAULT_MESSAGE_BLOCK_CONTENT,
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
        name: [{ type: 'paragraph', children: [{ text: 'Action button' }] }],
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
        name: [{ type: 'paragraph', children: [{ text: 'Sub-page' }] }],
        iconSource: LauncherIconSource.BUILTIN,
        iconType: 'pages-fill',
        content: DEFAULT_MESSAGE_BLOCK_CONTENT,
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

const ResourceCenterMainViewBody = () => {
  const {
    data: localData,
    addBlock,
    updateData: updateLocalData,
    currentTabId,
  } = useResourceCenterEditor();
  const { zIndex } = useBuilderConfig();
  const { t } = useTranslation();

  const currentTab = localData.tabs.find((tab) => tab.id === currentTabId);

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
              <Label htmlFor="header-text">{t('contentBuilder.resourceCenter.headerText')}</Label>
            </div>
            <Input
              variant="compact-muted"
              id="header-text"
              value={localData.headerText}
              onChange={(e) => {
                updateLocalData({ headerText: e.target.value });
              }}
              placeholder={t('contentBuilder.resourceCenter.headerTextPlaceholder')}
            />
          </div>

          {/* Launcher Button Text */}
          <div className="flex flex-col space-y-2">
            <div className={labelStyles}>
              <Label htmlFor="launcher-button-text">
                {t('contentBuilder.resourceCenter.launcherButtonText')}
              </Label>
            </div>
            <Input
              variant="compact-muted"
              id="launcher-button-text"
              value={localData.buttonText}
              onChange={(e) => {
                updateLocalData({ buttonText: e.target.value });
              }}
              placeholder={t('contentBuilder.resourceCenter.none')}
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
                      <RiAddCircleLine className="mr-2 size-4" />
                      {t('contentBuilder.resourceCenter.addBlock')}
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

export const ResourceCenterMainView = () => {
  const handleSave = useSidebarSave();
  return (
    <BuilderSidebarLayout onSave={handleSave}>
      <ResourceCenterMainViewBody />
    </BuilderSidebarLayout>
  );
};

ResourceCenterMainView.displayName = 'ResourceCenterMainView';
