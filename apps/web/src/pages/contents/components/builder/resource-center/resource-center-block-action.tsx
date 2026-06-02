'use client';

import { ChevronLeftIcon } from '@radix-ui/react-icons';
import {
  Button,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  ScrollArea,
  Switch,
  Label,
} from '@usertour/ui';
import { EXTENSION_CONTENT_RULES, EXTENSION_SELECT } from '@usertour/constants';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { Actions, PopperEditorMini } from '@usertour/editor';
import type { Descendant } from '@usertour/editor';
import { SpinnerIcon } from '@usertour/icons';
import { Conditions } from '@usertour/business-components';
import { useListEventsQuery, useSegmentListQuery } from '@usertour/hooks';
import {
  ContentActionsItemType,
  LauncherIconSource,
  ResourceCenterBlockType,
  RulesCondition,
} from '@usertour/types';
import { isRichTextEmpty } from '@usertour/helpers';
import { useTranslation } from 'react-i18next';
import {
  useBuilderConfig,
  useEnvironmentId,
  useProjectId,
} from '@/pages/contents/components/builder/core';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import { useActionsSaveGate } from '@/pages/contents/components/builder/hooks/use-actions-save-gate';
import { useConditionsSaveGate } from '@/pages/contents/components/builder/hooks/use-conditions-save-gate';
import { useToken } from '@/pages/contents/components/builder/hooks/use-token';
import { SidebarContainer } from '@/pages/contents/components/builder/components/sidebar';
import { IconPicker } from '@/pages/contents/components/builder/components/icon-picker';
import {
  ContentError,
  ContentErrorAnchor,
  ContentErrorContent,
} from '@/pages/contents/components/builder/components/content-error';

const BlockActionHeader = () => {
  const { setCurrentBlock, exitBlock } = useResourceCenterEditor();
  return (
    <CardHeader className="flex-none p-4 space-y-2">
      <CardTitle className="flex flex-row space-x-1 text-base items-center">
        <Button
          variant="link"
          size="icon"
          onClick={() => {
            setCurrentBlock(null);
            exitBlock();
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
  const { currentBlock, setCurrentBlock, isShowError } = useResourceCenterEditor();
  const { attributeList } = useAttributeList();
  const { contents } = useContentList();
  const { zIndex } = useBuilderConfig();
  const environmentId = useEnvironmentId();
  const projectId = useProjectId();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);
  const { t } = useTranslation();

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
            <Actions
              baseZIndex={zIndex + EXTENSION_SELECT}
              currentStep={undefined}
              filterItems={[
                ContentActionsItemType.FLOW_START,
                ContentActionsItemType.PAGE_NAVIGATE,
                ContentActionsItemType.JAVASCRIPT_EVALUATE,
              ]}
              currentVersion={undefined}
              onChange={handleClickedActionsChange}
              conditions={currentBlock.clickedActions ?? []}
              attributes={attributeList}
              contents={contents}
              token={token}
              t={t}
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
              <Conditions
                onChange={handleConditionsChange}
                conditions={currentBlock.onlyShowBlockConditions ?? []}
                attributes={attributeList}
                contents={contents}
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

const BlockActionFooter = () => {
  const { saveCurrentBlock, currentBlock, isLoading } = useResourceCenterEditor();
  const conditionsGate = useConditionsSaveGate();
  const actionsGate = useActionsSaveGate();
  const handleSave = () => {
    if (!conditionsGate(currentBlock?.onlyShowBlockConditions)) return;
    // clickedActions only exists on the ACTION block variant of the
    // ResourceCenterBlock union. Footer renders inside the action page so
    // currentBlock is known to be the ACTION shape; narrow via the type
    // discriminator so TS lets us read the field.
    const clickedActions =
      currentBlock?.type === ResourceCenterBlockType.ACTION
        ? currentBlock.clickedActions
        : undefined;
    if (!actionsGate(clickedActions)) return;
    saveCurrentBlock();
  };
  return (
    <CardFooter className="flex-none p-5">
      <Button className="w-full h-10" disabled={isLoading} onClick={handleSave}>
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
