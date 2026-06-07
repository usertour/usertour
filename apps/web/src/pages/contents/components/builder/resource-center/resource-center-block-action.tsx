'use client';

import { BUILDER_Z } from '@usertour/constants';
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
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { Actions, PopperEditorMini } from '@usertour/editor';
import type { Descendant } from '@usertour/editor';
import { RiArrowLeftSLine, SpinnerIcon } from '@usertour/icons';
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
import { useEnvironmentId, useProjectId } from '@/pages/contents/components/builder/core';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import { useActionsSaveGate } from '@/pages/contents/components/builder/hooks/use-actions-save-gate';
import { useConditionsSaveGate } from '@/pages/contents/components/builder/hooks/use-conditions-save-gate';
import { useToken } from '@/pages/contents/components/builder/hooks/use-token';
import { FloatingSidebarPanel } from '@/pages/contents/components/builder/components/sidebar';
import { IconPicker } from '@/pages/contents/components/builder/components/icon-picker';
import {
  ContentError,
  ContentErrorAnchor,
  ContentErrorContent,
} from '@/pages/contents/components/builder/components/content-error';

const BlockActionHeader = () => {
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
          className="mr-1.5 size-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RiArrowLeftSLine className="h-5 w-5" />
        </Button>
        <span className="truncate">{t('contentBuilder.resourceCenter.actionBlock')}</span>
      </CardTitle>
    </CardHeader>
  );
};

const BlockActionBody = () => {
  const { currentBlock, setCurrentBlock, isShowError } = useResourceCenterEditor();
  const { attributeList } = useAttributeList();
  const { contents } = useContentList();
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
    <CardContent className="grow overflow-hidden p-0">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          {/* Icon */}
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
                  className="bg-surface text-sm shadow-none rounded-lg"
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

          {/* When block is clicked */}
          <div className="flex flex-col space-y-2">
            <Label>{t('contentBuilder.resourceCenter.whenClicked')}</Label>
            <Actions
              baseZIndex={BUILDER_Z.popover}
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
                contents={contents}
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

const BlockActionFooter = () => {
  const { saveCurrentBlock, currentBlock, isLoading } = useResourceCenterEditor();
  const { t } = useTranslation();
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
    <CardFooter className="flex-none border-t border-border/50 p-4">
      <Button className="w-full h-10" disabled={isLoading} onClick={handleSave}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        {t('contentBuilder.common.save')}
      </Button>
    </CardFooter>
  );
};

export const ResourceCenterBlockAction = () => {
  return (
    <FloatingSidebarPanel width={320}>
      <BlockActionHeader />
      <BlockActionBody />
      <BlockActionFooter />
    </FloatingSidebarPanel>
  );
};

ResourceCenterBlockAction.displayName = 'ResourceCenterBlockAction';
