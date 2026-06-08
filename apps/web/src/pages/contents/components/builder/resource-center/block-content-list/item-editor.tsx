'use client';

import { BUILDER_Z } from '@usertour/constants';
import {
  Button,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  QuestionTooltip,
  ScrollArea,
  Switch,
} from '@usertour/ui';
import { RiArrowLeftSLine } from '@usertour/icons';
import { PopperEditorMini } from '@usertour/editor';
import type { Descendant } from '@usertour/editor';
import { Conditions } from '@usertour/business-components';
import { useListEventsQuery, useSegmentListQuery } from '@usertour/hooks';
import {
  type ContentListItem,
  LauncherIconSource,
  ResourceCenterBlockType,
  type RichTextNode,
  type RulesCondition,
} from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useEnvironmentId, useProjectId } from '@/pages/contents/components/builder/core';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useToken } from '@/pages/contents/components/builder/hooks/use-token';
import { IconPicker } from '@/pages/contents/components/builder/components/icon-picker';

// Sub-page editor for a single CONTENT_LIST block item. Mounted when
// the parent root sets `editingItemIndex` to a non-null value; the
// item's currently-resolved name renders in the header.

export interface ItemEditorHeaderProps {
  itemName: string;
  onBack: () => void;
}

export const ItemEditorHeader = (props: ItemEditorHeaderProps) => {
  const { itemName, onBack } = props;
  return (
    <CardHeader className="flex-none border-b border-border/50 px-5 py-4">
      <CardTitle className="flex flex-row items-center space-x-1 text-base font-semibold">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="mr-1.5 size-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RiArrowLeftSLine className="h-5 w-5" />
        </Button>
        <span className="truncate">{itemName}</span>
      </CardTitle>
    </CardHeader>
  );
};

ItemEditorHeader.displayName = 'ItemEditorHeader';

export interface ItemEditorBodyProps {
  itemIndex: number;
}

export const ItemEditorBody = (props: ItemEditorBodyProps) => {
  const { itemIndex } = props;
  const { currentBlock, setCurrentBlock } = useResourceCenterEditor();
  const { attributeList } = useAttributeList();
  const environmentId = useEnvironmentId();
  const projectId = useProjectId();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);
  const { t } = useTranslation();

  if (!currentBlock || currentBlock.type !== ResourceCenterBlockType.CONTENT_LIST) {
    return null;
  }

  const item = currentBlock.contentItems[itemIndex];
  if (!item) {
    return null;
  }

  const updateItem = (updates: Partial<ContentListItem>) => {
    setCurrentBlock((prev) => {
      if (!prev || prev.type !== ResourceCenterBlockType.CONTENT_LIST) {
        return null;
      }
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
    <CardContent className="grow overflow-hidden p-0">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          {/* Custom icon for this item */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-1">
              <Label>{t('contentBuilder.resourceCenter.customItemIcon')}</Label>
              <QuestionTooltip>
                <p>{t('contentBuilder.resourceCenter.customItemIconTooltip')}</p>
              </QuestionTooltip>
            </div>
            <IconPicker
              type={item.iconType ?? ''}
              iconSource={item.iconSource ?? LauncherIconSource.INHERIT}
              iconUrl={item.iconUrl}
              zIndex={BUILDER_Z.popover}
              showNoIcon={true}
              showInherit={true}
              onChange={handleIconChange}
            />
          </div>

          {/* Navigate to URL */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-1">
              <Label>{t('contentBuilder.resourceCenter.navigateUrl')}</Label>
              <QuestionTooltip>
                <p>{t('contentBuilder.resourceCenter.navigateUrlTooltip')}</p>
              </QuestionTooltip>
            </div>
            <PopperEditorMini
              className="bg-surface text-sm shadow-none rounded-lg"
              zIndex={BUILDER_Z.popover}
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
                {t('contentBuilder.resourceCenter.onlyListItem')}
              </Label>
              <Switch
                id="only-show-item"
                className="data-[state=unchecked]:bg-input"
                checked={item.onlyShowItem}
                onCheckedChange={handleOnlyShowItemChange}
              />
            </div>
            {item.onlyShowItem && (
              <Conditions
                onChange={handleOnlyShowItemConditionsChange}
                conditions={item.onlyShowItemConditions ?? []}
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

ItemEditorBody.displayName = 'ItemEditorBody';
