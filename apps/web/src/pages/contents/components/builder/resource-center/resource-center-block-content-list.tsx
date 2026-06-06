'use client';

import { BUILDER_Z } from '@usertour/constants';
import {
  Button,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Skeleton,
  QuestionTooltip,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Switch,
} from '@usertour/ui';
import { useAttributeList } from '@/hooks/use-attribute-list';
import {
  ChecklistIcon,
  CloseIcon,
  FlowIcon,
  PlusIcon,
  RiArrowLeftSLine,
  RiSettings3Line,
  SpinnerIcon,
} from '@usertour/icons';
import { Conditions } from '@usertour/business-components';
import { PopperEditorMini } from '@usertour/editor';
import type { Descendant } from '@usertour/editor';
import { useContentListQuery, useListEventsQuery, useSegmentListQuery } from '@usertour/hooks';
import {
  ContentDataType,
  ContentListItem,
  LauncherIconSource,
  ResourceCenterBlockType,
  RulesCondition,
} from '@usertour/types';
import { isRichTextEmpty } from '@usertour/helpers';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { ContentItemIcon } from '@/pages/contents/components/builder/resource-center/block-content-list/content-item-icon';
import {
  ItemEditorBody,
  ItemEditorHeader,
} from '@/pages/contents/components/builder/resource-center/block-content-list/item-editor';

// ============================================================================
// Content List Block — Main Page
// ============================================================================

const BlockContentListHeader = () => {
  const { setCurrentBlock, exitBlock } = useResourceCenterEditor();
  const { t } = useTranslation();
  return (
    <CardHeader className="flex-none border-b border-border/50 px-5 py-4">
      <CardTitle className="flex flex-row items-center space-x-1 text-base font-semibold pr-16">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setCurrentBlock(null);
            exitBlock();
          }}
          className="mr-1.5 size-7 shrink-0 rounded-md text-slate-600 hover:bg-muted hover:text-foreground"
        >
          <RiArrowLeftSLine className="h-5 w-5" />
        </Button>
        <span className="truncate">{t('contentBuilder.resourceCenter.contentListBlock')}</span>
      </CardTitle>
    </CardHeader>
  );
};

export interface BlockContentListBodyProps {
  onEditItem: (index: number) => void;
}

const BlockContentListBody = (props: BlockContentListBodyProps) => {
  const { onEditItem } = props;
  const { currentBlock, setCurrentBlock, isShowError } = useResourceCenterEditor();
  const { attributeList } = useAttributeList();
  const environmentId = useEnvironmentId();
  const projectId = useProjectId();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);

  const { contents: flowContents, loading: flowsLoading } = useContentListQuery({
    query: { environmentId, type: ContentDataType.FLOW },
  });

  const { contents: checklistContents, loading: checklistsLoading } = useContentListQuery({
    query: { environmentId, type: ContentDataType.CHECKLIST },
  });

  const contentListLoading = flowsLoading || checklistsLoading;

  // Build lookup maps for content names
  const contentMap = useMemo(() => {
    const map = new Map<string, { name: string; type: 'flow' | 'checklist' }>();
    for (const flow of flowContents) {
      map.set(flow.id, {
        name: flow.name || t('contentBuilder.resourceCenter.untitledFlow'),
        type: 'flow',
      });
    }
    for (const checklist of checklistContents) {
      map.set(checklist.id, {
        name: checklist.name || t('contentBuilder.resourceCenter.untitledChecklist'),
        type: 'checklist',
      });
    }
    return map;
  }, [flowContents, checklistContents, t]);

  const handleFilter = useCallback(
    (value: string, search: string) => {
      const allContents = [...flowContents, ...checklistContents];
      const item = allContents.find((content) => content.id === value);
      if (item?.name?.toLowerCase().includes(search.toLowerCase())) {
        return 1;
      }
      return 0;
    },
    [flowContents, checklistContents],
  );

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

  // Filter out already-selected items
  const selectedIds = new Set(currentBlock.contentItems.map((item) => item.contentId));
  const availableFlows = flowContents.filter((flow) => !selectedIds.has(flow.id));
  const availableChecklists = checklistContents.filter(
    (checklist) => !selectedIds.has(checklist.id),
  );

  return (
    <CardContent className="grow overflow-hidden p-0">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          {/* Block icon */}
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

          {/* Default icon for flows */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-1">
              <Label>{t('contentBuilder.resourceCenter.defaultFlowIcon')}</Label>
              <QuestionTooltip>
                <p>{t('contentBuilder.resourceCenter.defaultFlowIconTooltip')}</p>
              </QuestionTooltip>
            </div>
            <IconPicker
              type={currentBlock.flowIconType}
              iconSource={currentBlock.flowIconSource}
              iconUrl={currentBlock.flowIconUrl}
              zIndex={BUILDER_Z.popover}
              showNoIcon={true}
              onChange={handleFlowIconChange}
            />
          </div>

          {/* Default icon for checklists */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-1">
              <Label>{t('contentBuilder.resourceCenter.defaultChecklistIcon')}</Label>
              <QuestionTooltip>
                <p>{t('contentBuilder.resourceCenter.defaultChecklistIconTooltip')}</p>
              </QuestionTooltip>
            </div>
            <IconPicker
              type={currentBlock.checklistIconType}
              iconSource={currentBlock.checklistIconSource}
              iconUrl={currentBlock.checklistIconUrl}
              zIndex={BUILDER_Z.popover}
              showNoIcon={true}
              onChange={handleChecklistIconChange}
            />
          </div>

          {/* Content items */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label>{t('contentBuilder.resourceCenter.contentLabel')}</Label>
                <QuestionTooltip>
                  <p>{t('contentBuilder.resourceCenter.contentTooltip')}</p>
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
                                <RiSettings3Line size={16} className="opacity-70" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t('contentBuilder.resourceCenter.edit')}
                            </TooltipContent>
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
                                <CloseIcon width={16} height={16} className="opacity-70" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t('contentBuilder.resourceCenter.remove')}
                            </TooltipContent>
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
                  <PlusIcon width={16} height={16} className="opacity-70" />
                  {t('contentBuilder.resourceCenter.add')}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" style={{ zIndex: BUILDER_Z.popover }}>
                <Command filter={handleFilter}>
                  <CommandInput
                    placeholder={t('contentBuilder.resourceCenter.searchContentPlaceholder')}
                  />
                  <CommandEmpty>{t('contentBuilder.resourceCenter.noItemsFound')}</CommandEmpty>
                  <CommandList>
                    <ScrollArea className="h-72">
                      {availableFlows.length > 0 && (
                        <CommandGroup heading={t('contentBuilder.resourceCenter.flowsHeading')}>
                          {availableFlows.map((flow) => (
                            <CommandItem
                              key={flow.id}
                              value={flow.id}
                              onSelect={() => handleAddContent(flow.id, 'flow')}
                            >
                              <FlowIcon
                                width={16}
                                height={16}
                                className="mr-2 flex-shrink-0 opacity-70"
                              />
                              <span className="truncate" title={flow.name}>
                                {flow.name || t('contentBuilder.resourceCenter.untitledFlow')}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {availableChecklists.length > 0 && (
                        <CommandGroup
                          heading={t('contentBuilder.resourceCenter.checklistsHeading')}
                        >
                          {availableChecklists.map((checklist) => (
                            <CommandItem
                              key={checklist.id}
                              value={checklist.id}
                              onSelect={() => handleAddContent(checklist.id, 'checklist')}
                            >
                              <ChecklistIcon
                                width={16}
                                height={16}
                                className="mr-2 flex-shrink-0 opacity-70"
                              />
                              <span className="truncate" title={checklist.name}>
                                {checklist.name ||
                                  t('contentBuilder.resourceCenter.untitledChecklist')}
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
                {t('contentBuilder.resourceCenter.removeAllContent')}
              </div>
            )}
          </div>

          {/* Show search field */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="show-search-field" className="font-normal">
                {t('contentBuilder.resourceCenter.showSearchField')}
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

const BlockContentListFooter = () => {
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

// ============================================================================
// Root Component
// ============================================================================

export const ResourceCenterBlockContentList = () => {
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const { currentBlock } = useResourceCenterEditor();
  const environmentId = useEnvironmentId();
  const { t } = useTranslation();

  const { contents: flowContents } = useContentListQuery({
    query: {
      environmentId,
      type: ContentDataType.FLOW,
    },
  });
  const { contents: checklistContents } = useContentListQuery({
    query: {
      environmentId,
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
    return (
      content?.name ||
      (item.contentType === 'flow'
        ? t('contentBuilder.resourceCenter.untitledFlow')
        : t('contentBuilder.resourceCenter.untitledChecklist'))
    );
  }, [editingItemIndex, currentBlock, flowContents, checklistContents, t]);

  if (editingItemIndex !== null) {
    return (
      <FloatingSidebarPanel width={320}>
        <ItemEditorHeader itemName={editingItemName} onBack={() => setEditingItemIndex(null)} />
        <ItemEditorBody itemIndex={editingItemIndex} />
        <CardFooter className="flex-none border-t border-border/50 p-4">
          <Button className="w-full h-10" onClick={() => setEditingItemIndex(null)}>
            {t('contentBuilder.resourceCenter.done')}
          </Button>
        </CardFooter>
      </FloatingSidebarPanel>
    );
  }

  return (
    <FloatingSidebarPanel width={320}>
      <BlockContentListHeader />
      <BlockContentListBody onEditItem={setEditingItemIndex} />
      <BlockContentListFooter />
    </FloatingSidebarPanel>
  );
};

ResourceCenterBlockContentList.displayName = 'ResourceCenterBlockContentList';
