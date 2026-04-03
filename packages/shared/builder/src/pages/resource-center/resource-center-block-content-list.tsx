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
  SpinnerIcon,
} from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { Rules } from '@usertour-packages/shared-components';
import {
  useContentListQuery,
  useListEventsQuery,
  useSegmentListQuery,
} from '@usertour-packages/shared-hooks';
import { Switch } from '@usertour-packages/switch';
import {
  ContentDataType,
  ContentListItem,
  LauncherIconSource,
  ResourceCenterBlockType,
  RulesCondition,
} from '@usertour/types';
import { useCallback, useMemo, useState } from 'react';
import { BuilderMode, useBuilderContext, useResourceCenterContext } from '../../contexts';
import { useToken } from '../../hooks/use-token';
import { SidebarContainer } from '../sidebar';
import { IconPicker } from '../../components/icon-picker';

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

const BlockContentListBody = () => {
  const { currentBlock, setCurrentBlock, zIndex } = useResourceCenterContext();
  const { attributeList } = useAttributeListContext();
  const { environmentId, projectId } = useBuilderContext();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);
  const [addOpen, setAddOpen] = useState(false);

  const { contents: flowContents } = useContentListQuery({
    query: { environmentId, type: ContentDataType.FLOW },
  });

  const { contents: checklistContents } = useContentListQuery({
    query: { environmentId, type: ContentDataType.CHECKLIST },
  });

  if (!currentBlock || currentBlock.type !== ResourceCenterBlockType.CONTENT_LIST) {
    return null;
  }

  const handleInputChange = (field: 'name') => (e: React.ChangeEvent<HTMLInputElement>) => {
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
        contentItems: [...prev.contentItems, { contentId, contentType }],
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
    setCurrentBlock((prev) => (prev ? { ...prev, onlyShowTask: value } : null));
  };

  const handleConditionsChange = (value: RulesCondition[]) => {
    setCurrentBlock((prev) => (prev ? { ...prev, onlyShowTaskConditions: value } : null));
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
            <Label htmlFor="content-list-block-name">Name</Label>
            <Input
              id="content-list-block-name"
              className="bg-background-900"
              value={currentBlock.name}
              placeholder="Guided tours"
              onChange={handleInputChange('name')}
            />
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

          {/* Flows/checklists to display */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <Label>Flows/checklists to display</Label>
            </div>
            <hr className="border-t" />

            {/* Selected items list */}
            {currentBlock.contentItems.map((item: ContentListItem) => {
              const info = contentMap.get(item.contentId);
              return (
                <div
                  key={item.contentId}
                  className="relative group border-b hover:bg-muted"
                  style={{ marginTop: '0' }}
                >
                  <div className="flex items-center gap-2 p-2">
                    {item.contentType === 'flow' ? (
                      <FlowIcon width={16} height={16} className="flex-shrink-0" />
                    ) : (
                      <ChecklistIcon width={16} height={16} className="flex-shrink-0" />
                    )}
                    <span className="truncate text-sm">{info?.name || item.contentId}</span>
                  </div>
                  <div className="absolute top-1/2 right-2 transform -translate-y-1/2 hidden group-hover:flex items-center justify-center">
                    <Button
                      variant={'ghost'}
                      className="mr-1 w-6 h-6 p-1 rounded cursor-pointer"
                      onClick={() => handleRemoveContent(item.contentId)}
                    >
                      <CloseIcon width={16} height={16} />
                    </Button>
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

export const ResourceCenterBlockContentList = () => {
  return (
    <SidebarContainer>
      <BlockContentListHeader />
      <BlockContentListBody />
      <BlockContentListFooter />
    </SidebarContainer>
  );
};

ResourceCenterBlockContentList.displayName = 'ResourceCenterBlockContentList';
