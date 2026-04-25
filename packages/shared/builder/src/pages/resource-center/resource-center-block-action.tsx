'use client';

import { ChevronLeftIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { EXTENSION_CONTENT_RULES, EXTENSION_SELECT } from '@usertour-packages/constants';
import { useAttributeListContext, useContentListContext } from '@usertour-packages/contexts';
import { ContentActions, PopperEditorMini } from '@usertour-packages/shared-editor';
import type { Descendant } from '@usertour-packages/shared-editor';
import { SpinnerIcon } from '@usertour-packages/icons';
import { Label } from '@usertour-packages/label';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { Rules } from '@usertour-packages/shared-components';
import { useListEventsQuery, useSegmentListQuery } from '@usertour-packages/shared-hooks';
import { Switch } from '@usertour-packages/switch';
import {
  ContentActionsItemType,
  LauncherIconSource,
  ResourceCenterBlockType,
  RulesCondition,
} from '@usertour/types';
import { isRichTextEmpty } from '@usertour/helpers';
import { BuilderMode, useBuilderContext, useResourceCenterContext } from '../../contexts';
import { useToken } from '../../hooks/use-token';
import { SidebarContainer } from '../sidebar';
import { IconPicker } from '../../components/icon-picker';
import {
  ContentError,
  ContentErrorAnchor,
  ContentErrorContent,
} from '../../components/content-error';

const BlockActionHeader = () => {
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
        <span className="truncate">Action block</span>
      </CardTitle>
    </CardHeader>
  );
};

const BlockActionBody = () => {
  const { currentBlock, setCurrentBlock, zIndex, isShowError } = useResourceCenterContext();
  const { attributeList } = useAttributeListContext();
  const { contents } = useContentListContext();
  const { environmentId, projectId } = useBuilderContext();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);

  if (!currentBlock || currentBlock.type !== ResourceCenterBlockType.ACTION) {
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

  const handleClickedActionsChange = (value: RulesCondition[]) => {
    setCurrentBlock((prev) => (prev ? { ...prev, clickedActions: value } : null));
  };

  const handleOnlyShowChange = (value: boolean) => {
    setCurrentBlock((prev) => (prev ? { ...prev, onlyShowBlock: value } : null));
  };

  const handleConditionsChange = (value: RulesCondition[]) => {
    setCurrentBlock((prev) => (prev ? { ...prev, onlyShowBlockConditions: value } : null));
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

          {/* When block is clicked */}
          <div className="flex flex-col space-y-2">
            <Label>When block is clicked</Label>
            <ContentActions
              zIndex={zIndex + EXTENSION_SELECT}
              isShowIf={false}
              isShowLogic={false}
              currentStep={undefined}
              filterItems={[
                ContentActionsItemType.FLOW_START,
                ContentActionsItemType.PAGE_NAVIGATE,
                ContentActionsItemType.JAVASCRIPT_EVALUATE,
              ]}
              currentVersion={undefined}
              onDataChange={handleClickedActionsChange}
              defaultConditions={currentBlock.clickedActions ?? []}
              attributes={attributeList}
              contents={contents}
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
                checked={currentBlock.onlyShowBlock}
                onCheckedChange={handleOnlyShowChange}
              />
            </div>
            {currentBlock.onlyShowBlock && (
              <Rules
                onDataChange={handleConditionsChange}
                defaultConditions={currentBlock.onlyShowBlockConditions ?? []}
                attributes={attributeList}
                contents={contents}
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

const BlockActionFooter = () => {
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

export const ResourceCenterBlockAction = () => {
  return (
    <SidebarContainer>
      <BlockActionHeader />
      <BlockActionBody />
      <BlockActionFooter />
    </SidebarContainer>
  );
};

ResourceCenterBlockAction.displayName = 'ResourceCenterBlockAction';
