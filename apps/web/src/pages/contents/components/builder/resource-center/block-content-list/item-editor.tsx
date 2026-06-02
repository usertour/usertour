'use client';

import { ChevronLeftIcon } from '@radix-ui/react-icons';
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
import { EXTENSION_CONTENT_RULES, EXTENSION_SELECT } from '@usertour/constants';
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
import {
  useBuilderConfig,
  useEnvironmentId,
  useProjectId,
} from '@/pages/contents/components/builder/core';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useToken } from '@/pages/contents/components/builder/core/hooks/use-token';
import { IconPicker } from '@/pages/contents/components/builder/core/components/icon-picker';

// Sub-page editor for a single CONTENT_LIST block item. Mounted when
// the parent root sets `editingItemIndex` to a non-null value; the
// item's currently-resolved name renders in the header.

export interface ItemEditorHeaderProps {
  itemName: string;
  onBack: () => void;
}

export const ItemEditorHeader = ({ itemName, onBack }: ItemEditorHeaderProps) => (
  <CardHeader className="flex-none p-4 space-y-2">
    <CardTitle className="flex flex-row space-x-1 text-base items-center">
      <Button variant="link" size="icon" onClick={onBack} className="text-foreground w-6 h-8">
        <ChevronLeftIcon className="h-6 w-6" />
      </Button>
      <span className="truncate">{itemName}</span>
    </CardTitle>
  </CardHeader>
);

ItemEditorHeader.displayName = 'ItemEditorHeader';

export interface ItemEditorBodyProps {
  itemIndex: number;
}

export const ItemEditorBody = ({ itemIndex }: ItemEditorBodyProps) => {
  const { currentBlock, setCurrentBlock } = useResourceCenterEditor();
  const { attributeList } = useAttributeList();
  const { zIndex } = useBuilderConfig();
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
              <Conditions
                onChange={handleOnlyShowItemConditionsChange}
                conditions={item.onlyShowItemConditions ?? []}
                attributes={attributeList}
                contents={[]}
                segments={segmentList}
                events={eventList}
                token={token}
                baseZIndex={EXTENSION_CONTENT_RULES}
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
