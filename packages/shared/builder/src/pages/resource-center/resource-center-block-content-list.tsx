'use client';

import { ChevronLeftIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@usertour-packages/command';
import { EXTENSION_CONTENT_RULES, EXTENSION_SELECT } from '@usertour-packages/constants';
import { useAttributeListContext } from '@usertour-packages/contexts';
import {
  ChecklistIcon,
  CloseIcon,
  FlowIcon,
  PlusIcon,
  RiSettings3Line,
  SpinnerIcon,
} from '@usertour-packages/icons';
import { Label } from '@usertour-packages/label';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { Skeleton } from '@usertour-packages/skeleton';
import { Rules } from '@usertour-packages/shared-components';
import { PopperEditorMini } from '@usertour-packages/shared-editor';
import type { Descendant } from '@usertour-packages/shared-editor';
import {
  useContentListQuery,
  useListEventsQuery,
  useSegmentListQuery,
} from '@usertour-packages/shared-hooks';
import { Switch } from '@usertour-packages/switch';
import {
  QuestionTooltip,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import {
  ContentDataType,
  ContentListItem,
  LauncherIconSource,
  ResourceCenterBlockType,
  ResourceCenterContentListBlock,
  RulesCondition,
  type RichTextNode,
} from '@usertour/types';
import { useCallback, useMemo, useState } from 'react';
import { BuilderMode, useBuilderContext, useResourceCenterContext } from '../../contexts';
import { useToken } from '../../hooks/use-token';
import { SidebarContainer } from '../sidebar';
import { IconPicker } from '../../components/icon-picker';
import { IconsList } from '@usertour-packages/widget';

// ============================================================================
// Resolve content list item icon for builder preview
// ============================================================================

const ContentItemIcon = ({
  item,
  block,
}: {
  item: ContentListItem;
  block: ResourceCenterContentListBlock;
}) => {
  const source = item.iconSource;

  // Resolve which icon source/type/url to use
  let resolvedSource: LauncherIconSource;
  let resolvedType: string;
  let resolvedUrl: string | undefined;

  if (!source || source === LauncherIconSource.INHERIT) {
    // Use block-level default by content type
    if (item.contentType === 'flow') {
      resolvedSource = block.flowIconSource;
      resolvedType = block.flowIconType;
      resolvedUrl = block.flowIconUrl;
    } else {
      resolvedSource = block.checklistIconSource;
      resolvedType = block.checklistIconType;
      resolvedUrl = block.checklistIconUrl;
    }
  } else if (source === LauncherIconSource.NONE) {
    return null;
  } else {
    resolvedSource = source;
    resolvedType = item.iconType ?? '';
    resolvedUrl = item.iconUrl;
  }

  if (resolvedSource === LauncherIconSource.NONE) {
    return null;
  }

  if (
    (resolvedSource === LauncherIconSource.UPLOAD || resolvedSource === LauncherIconSource.URL) &&
    resolvedUrl
  ) {
    return <img src={resolvedUrl} alt="" className="flex-shrink-0 object-contain w-4 h-4" />;
  }

  if (resolvedSource === LauncherIconSource.BUILTIN && resolvedType) {
    const iconItem = IconsList.find((i) => i.name === resolvedType);
    if (iconItem) {
      const Icon = iconItem.ICON;
      return <Icon size={16} className="flex-shrink-0" />;
    }
  }

  return null;
};

// ============================================================================
// Content List Block — Main Page
// ============================================================================

const BlockContentListHeader = () => {
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
        <span className="truncate">List of flows/checklists</span>
      </CardTitle>
    </CardHeader>
  );
};

interface BlockContentListBodyProps {
  onEditItem: (index: number) => void;
}

const BlockContentListBody = ({ onEditItem }: BlockContentListBodyProps) => {
  const { currentBlock, setCurrentBlock, zIndex } = useResourceCenterContext();
  const { attributeList } = useAttributeListContext();
  const { environmentId, projectId } = useBuilderContext();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);
  const [addOpen, setAddOpen] = useState(false);

  const { contents: flowContents, loading: flowsLoading } = useContentListQuery({
    query: { environmentId, type: ContentDataType.FLOW },
  });

  const { contents: checklistContents, loading: checklistsLoading } = useContentListQuery({
    query: { environmentId, type: ContentDataType.CHECKLIST },
  });

  const contentListLoading = flowsLoading || checklistsLoading;

  if (!currentBlock || currentBlock.type !== ResourceCenterBlockType.CONTENT_LIST) {
    return null;
  }

  const handleNameChange = (value: Descendant[]) => {
    setCurrentBlock((prev) => (prev ? ({ ...prev, name: value } as typeof prev) : null));
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

  const handleFlowIconChange = (updates: {
    iconType?: string;
    iconSource?: LauncherIconSource;
    iconUrl?: string;
  }) => {
    setCurrentBlock((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ...(updates.iconType !== undefined && { flowIconType: updates.iconType }),
        ...(updates.iconSource !== undefined && { flowIconSource: updates.iconSource }),
        ...(updates.iconUrl !== undefined
          ? { flowIconUrl: updates.iconUrl }
          : { flowIconUrl: undefined }),
      };
    });
  };

  const handleChecklistIconChange = (updates: {
    iconType?: string;
    iconSource?: LauncherIconSource;
    iconUrl?: string;
  }) => {
    setCurrentBlock((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ...(updates.iconType !== undefined && { checklistIconType: updates.iconType }),
        ...(updates.iconSource !== undefined && { checklistIconSource: updates.iconSource }),
        ...(updates.iconUrl !== undefined
          ? { checklistIconUrl: updates.iconUrl }
          : { checklistIconUrl: undefined }),
      };
    });
  };

  const handleShowSearchFieldChange = (value: boolean) => {
    setCurrentBlock((prev) => (prev ? { ...prev, showSearchField: value } : null));
  };

  const handleAddContent = (contentId: string, contentType: 'flow' | 'checklist') => {
    setCurrentBlock((prev) => {
      if (!prev || prev.type !== ResourceCenterBlockType.CONTENT_LIST) return null;
      const exists = prev.contentItems.some((item) => item.contentId === contentId);
      if (exists) return prev;
      return {
        ...prev,
        contentItems: [
          ...prev.contentItems,
          {
            contentId,
            contentType,
            onlyShowItem: false,
            onlyShowItemConditions: [],
          },
        ],
      };
    });
    setAddOpen(false);
  };

  const handleRemoveContent = (contentId: string) => {
    setCurrentBlock((prev) => {
      if (!prev || prev.type !== ResourceCenterBlockType.CONTENT_LIST) return null;
      return {
        ...prev,
        contentItems: prev.contentItems.filter((item) => item.contentId !== contentId),
      };
    });
  };

  const handleRemoveAll = () => {
    setCurrentBlock((prev) => {
      if (!prev || prev.type !== ResourceCenterBlockType.CONTENT_LIST) return null;
      return { ...prev, contentItems: [] };
    });
  };

  const handleOnlyShowChange = (value: boolean) => {
    setCurrentBlock((prev) => (prev ? { ...prev, onlyShowBlock: value } : null));
  };

  const handleConditionsChange = (value: RulesCondition[]) => {
    setCurrentBlock((prev) => (prev ? { ...prev, onlyShowBlockConditions: value } : null));
  };

  // Build lookup maps for content names
  const contentMap = useMemo(() => {
    const map = new Map<string, { name: string; type: 'flow' | 'checklist' }>();
    for (const c of flowContents) {
      map.set(c.id, { name: c.name || 'Untitled flow', type: 'flow' });
    }
    for (const c of checklistContents) {
      map.set(c.id, { name: c.name || 'Untitled checklist', type: 'checklist' });
    }
    return map;
  }, [flowContents, checklistContents]);

  // Filter out already-selected items
  const selectedIds = new Set(currentBlock.contentItems.map((item) => item.contentId));
  const availableFlows = flowContents.filter((c) => !selectedIds.has(c.id));
  const availableChecklists = checklistContents.filter((c) => !selectedIds.has(c.id));

  const handleFilter = useCallback(
    (value: string, search: string) => {
      const allContents = [...flowContents, ...checklistContents];
      const item = allContents.find((c) => c.id === value);
      if (item?.name?.toLowerCase().includes(search.toLowerCase())) {
        return 1;
      }
      return 0;
    },
    [flowContents, checklistContents],
  );

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          {/* Block icon */}
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
            <Label>Name</Label>
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
          </div>

          {/* Default icon for flows */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-1">
              <Label>Default icon for flows</Label>
              <QuestionTooltip>
                <p>Icon shown for flow items unless overridden per item.</p>
              </QuestionTooltip>
            </div>
            <IconPicker
              type={currentBlock.flowIconType}
              iconSource={currentBlock.flowIconSource}
              iconUrl={currentBlock.flowIconUrl}
              zIndex={zIndex + EXTENSION_SELECT}
              showNoIcon={true}
              onChange={handleFlowIconChange}
            />
          </div>

          {/* Default icon for checklists */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-1">
              <Label>Default icon for checklists</Label>
              <QuestionTooltip>
                <p>Icon shown for checklist items unless overridden per item.</p>
              </QuestionTooltip>
            </div>
            <IconPicker
              type={currentBlock.checklistIconType}
              iconSource={currentBlock.checklistIconSource}
              iconUrl={currentBlock.checklistIconUrl}
              zIndex={zIndex + EXTENSION_SELECT}
              showNoIcon={true}
              onChange={handleChecklistIconChange}
            />
          </div>

          {/* Content items */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label>Content</Label>
                <QuestionTooltip>
                  <p>Only flows and checklists can be added. Click an item to edit its settings.</p>
                </QuestionTooltip>
              </div>
            </div>
            <hr className="border-t" />

            {/* Selected items list */}
            {contentListLoading
              ? currentBlock.contentItems.map((item: ContentListItem) => (
                  <div key={item.contentId} className="p-2" style={{ marginTop: '0' }}>
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))
              : currentBlock.contentItems.map((item: ContentListItem, index: number) => {
                  const info = contentMap.get(item.contentId);
                  return (
                    <div
                      key={item.contentId}
                      className="relative group border-b hover:bg-muted"
                      style={{ marginTop: '0' }}
                    >
                      <div className="flex items-center gap-2 p-2">
                        <ContentItemIcon item={item} block={currentBlock} />
                        <span className="truncate text-sm">{info?.name || item.contentId}</span>
                      </div>
                      <div className="absolute top-1/2 right-2 transform -translate-y-1/2 hidden group-hover:flex items-center justify-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={'ghost'}
                                className="w-6 h-6 p-1 rounded cursor-pointer"
                                onClick={() => onEditItem(index)}
                              >
                                <RiSettings3Line size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={'ghost'}
                                className="w-6 h-6 p-1 rounded cursor-pointer"
                                onClick={() => handleRemoveContent(item.contentId)}
                              >
                                <CloseIcon width={16} height={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  );
                })}

            {/* Add content button / popover */}
            <Popover open={addOpen} onOpenChange={setAddOpen}>
              <PopoverTrigger asChild>
                <div
                  className="h-8 text-primary items-center flex flex-row justify-center rounded-md text-sm font-medium cursor-pointer"
                  onClick={() => setAddOpen(true)}
                >
                  <PlusIcon width={16} height={16} />
                  Add
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="w-[280px] p-0"
                style={{ zIndex: zIndex + EXTENSION_SELECT }}
              >
                <Command filter={handleFilter}>
                  <CommandInput placeholder="Search flow/checklist..." />
                  <CommandEmpty>No items found.</CommandEmpty>
                  <CommandList>
                    <ScrollArea className="h-72">
                      {availableFlows.length > 0 && (
                        <CommandGroup heading="Flows">
                          {availableFlows.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={item.id}
                              onSelect={() => handleAddContent(item.id, 'flow')}
                            >
                              <FlowIcon width={16} height={16} className="mr-2 flex-shrink-0" />
                              <span className="truncate" title={item.name}>
                                {item.name || 'Untitled flow'}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {availableChecklists.length > 0 && (
                        <CommandGroup heading="Checklists">
                          {availableChecklists.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={item.id}
                              onSelect={() => handleAddContent(item.id, 'checklist')}
                            >
                              <ChecklistIcon
                                width={16}
                                height={16}
                                className="mr-2 flex-shrink-0"
                              />
                              <span className="truncate" title={item.name}>
                                {item.name || 'Untitled checklist'}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </ScrollArea>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Remove all */}
            {currentBlock.contentItems.length > 0 && (
              <div
                className="h-8 text-destructive items-center flex flex-row justify-center rounded-md text-sm font-medium cursor-pointer"
                onClick={handleRemoveAll}
              >
                × Remove all flows/checklists
              </div>
            )}
          </div>

          {/* Show search field */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="show-search-field" className="font-normal">
                Show search field
              </Label>
              <Switch
                id="show-search-field"
                className="data-[state=unchecked]:bg-input"
                checked={currentBlock.showSearchField}
                onCheckedChange={handleShowSearchFieldChange}
              />
            </div>
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

const BlockContentListFooter = () => {
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

// ============================================================================
// Content List Item — Editing Sub-Page
// ============================================================================

interface ContentListItemEditorHeaderProps {
  itemName: string;
  onBack: () => void;
}

const ContentListItemEditorHeader = ({ itemName, onBack }: ContentListItemEditorHeaderProps) => {
  return (
    <CardHeader className="flex-none p-4 space-y-2">
      <CardTitle className="flex flex-row space-x-1 text-base items-center">
        <Button variant="link" size="icon" onClick={onBack} className="text-foreground w-6 h-8">
          <ChevronLeftIcon className="h-6 w-6" />
        </Button>
        <span className="truncate">{itemName}</span>
      </CardTitle>
    </CardHeader>
  );
};

interface ContentListItemEditorBodyProps {
  itemIndex: number;
}

const ContentListItemEditorBody = ({ itemIndex }: ContentListItemEditorBodyProps) => {
  const { currentBlock, setCurrentBlock, zIndex } = useResourceCenterContext();
  const { attributeList } = useAttributeListContext();
  const { environmentId, projectId } = useBuilderContext();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);

  if (!currentBlock || currentBlock.type !== ResourceCenterBlockType.CONTENT_LIST) {
    return null;
  }

  const item = currentBlock.contentItems[itemIndex];
  if (!item) return null;

  const updateItem = (updates: Partial<ContentListItem>) => {
    setCurrentBlock((prev) => {
      if (!prev || prev.type !== ResourceCenterBlockType.CONTENT_LIST) return null;
      const newItems = [...prev.contentItems];
      newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
      return { ...prev, contentItems: newItems };
    });
  };

  const handleIconChange = (updates: {
    iconType?: string;
    iconSource?: LauncherIconSource;
    iconUrl?: string;
  }) => {
    updateItem({
      ...(updates.iconType !== undefined && { iconType: updates.iconType }),
      ...(updates.iconSource !== undefined && { iconSource: updates.iconSource }),
      ...(updates.iconUrl !== undefined ? { iconUrl: updates.iconUrl } : { iconUrl: undefined }),
    });
  };

  const handleNavigateUrlChange = (value: Descendant[]) => {
    updateItem({ navigateUrl: value as unknown as RichTextNode[], navigateOpenType: 'same' });
  };

  const handleOnlyShowItemChange = (value: boolean) => {
    updateItem({ onlyShowItem: value });
  };

  const handleOnlyShowItemConditionsChange = (value: RulesCondition[]) => {
    updateItem({ onlyShowItemConditions: value });
  };

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          {/* Custom icon for this item */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-1">
              <Label>Custom icon for this item</Label>
              <QuestionTooltip>
                <p>
                  Override the default icon for this item. Select "Default" to use the block
                  default.
                </p>
              </QuestionTooltip>
            </div>
            <IconPicker
              type={item.iconType ?? ''}
              iconSource={item.iconSource ?? LauncherIconSource.INHERIT}
              iconUrl={item.iconUrl}
              zIndex={zIndex + EXTENSION_SELECT}
              showNoIcon={true}
              showInherit={true}
              onChange={handleIconChange}
            />
          </div>

          {/* Navigate to URL */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-1">
              <Label>Navigate to URL when clicked</Label>
              <QuestionTooltip>
                <p>
                  Navigate the user to this URL when the item is clicked. Supports user attributes.
                </p>
              </QuestionTooltip>
            </div>
            <PopperEditorMini
              zIndex={zIndex + EXTENSION_SELECT}
              initialValue={
                (item.navigateUrl as Descendant[]) ?? [
                  { type: 'paragraph', children: [{ text: '' }] },
                ]
              }
              onValueChange={handleNavigateUrlChange}
              attributes={attributeList}
            />
          </div>

          {/* Only list item if... */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="only-show-item" className="font-normal">
                Only list item if...
              </Label>
              <Switch
                id="only-show-item"
                className="data-[state=unchecked]:bg-input"
                checked={item.onlyShowItem}
                onCheckedChange={handleOnlyShowItemChange}
              />
            </div>
            {item.onlyShowItem && (
              <Rules
                onDataChange={handleOnlyShowItemConditionsChange}
                defaultConditions={item.onlyShowItemConditions ?? []}
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

// ============================================================================
// Root Component
// ============================================================================

export const ResourceCenterBlockContentList = () => {
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const { currentBlock } = useResourceCenterContext();

  const { contents: flowContents } = useContentListQuery({
    query: {
      environmentId: useBuilderContext().environmentId,
      type: ContentDataType.FLOW,
    },
  });
  const { contents: checklistContents } = useContentListQuery({
    query: {
      environmentId: useBuilderContext().environmentId,
      type: ContentDataType.CHECKLIST,
    },
  });

  // Resolve the item name for the sub-page header
  const editingItemName = useMemo(() => {
    if (
      editingItemIndex === null ||
      !currentBlock ||
      currentBlock.type !== ResourceCenterBlockType.CONTENT_LIST
    ) {
      return '';
    }
    const item = currentBlock.contentItems[editingItemIndex];
    if (!item) return '';
    const allContents = [...flowContents, ...checklistContents];
    const content = allContents.find((c) => c.id === item.contentId);
    return content?.name || (item.contentType === 'flow' ? 'Untitled flow' : 'Untitled checklist');
  }, [editingItemIndex, currentBlock, flowContents, checklistContents]);

  if (editingItemIndex !== null) {
    return (
      <SidebarContainer>
        <ContentListItemEditorHeader
          itemName={editingItemName}
          onBack={() => setEditingItemIndex(null)}
        />
        <ContentListItemEditorBody itemIndex={editingItemIndex} />
        <CardFooter className="flex-none p-5">
          <Button className="w-full h-10" onClick={() => setEditingItemIndex(null)}>
            Done
          </Button>
        </CardFooter>
      </SidebarContainer>
    );
  }

  return (
    <SidebarContainer>
      <BlockContentListHeader />
      <BlockContentListBody onEditItem={setEditingItemIndex} />
      <BlockContentListFooter />
    </SidebarContainer>
  );
};

ResourceCenterBlockContentList.displayName = 'ResourceCenterBlockContentList';
