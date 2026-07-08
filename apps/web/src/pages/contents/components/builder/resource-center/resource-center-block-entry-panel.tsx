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
import { RiArrowLeftSLine, SpinnerIcon } from '@usertour/icons';
import { Callout } from '@/pages/contents/components/builder/shared/callout';
import { PopperEditorMini } from '@usertour/editor';
import type { Descendant } from '@usertour/editor';
import { Conditions } from '@usertour/business-components';
import { useListEventsQuery, useSegmentListQuery } from '@usertour/hooks';
import { LauncherIconSource, ResourceCenterBlockType, RulesCondition } from '@usertour/types';
import { isRichTextEmpty } from '@usertour/helpers';
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

/**
 * Shared editor panel for the "navigation entry" blocks (sub-page,
 * announcement): both configure only an icon, a name, and block visibility
 * conditions, so they render the same panel parameterized by block type and
 * the title / info copy.
 */
export interface ResourceCenterBlockEntryPanelProps {
  blockType: ResourceCenterBlockType;
  /** i18n key for the panel header title. */
  titleKey: string;
  /** i18n key for the info callout at the top of the body. */
  infoKey: string;
}

interface EntryPanelSectionProps {
  blockType: ResourceCenterBlockType;
  titleKey: string;
  infoKey: string;
}

const EntryPanelHeader = (props: EntryPanelSectionProps) => {
  const { titleKey } = props;
  const { setCurrentBlock, exitBlock } = useResourceCenterEditor();
  const { t } = useTranslation();
  return (
    <CardHeader className="flex-none border-b border-border/50 px-5 py-4">
      <CardTitle className="flex flex-row items-center space-x-1 text-base font-medium pr-16">
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
        <span className="truncate">{t(titleKey)}</span>
      </CardTitle>
    </CardHeader>
  );
};

const EntryPanelBody = (props: EntryPanelSectionProps) => {
  const { blockType, infoKey } = props;
  const { currentBlock, setCurrentBlock, isShowError } = useResourceCenterEditor();
  const { attributeList } = useAttributeList();
  const environmentId = useEnvironmentId();
  const projectId = useProjectId();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);
  const { t } = useTranslation();

  // The runtime gate is `type !== blockType`; the two extra literal comparisons
  // exist for TypeScript, which can't narrow the block union through a runtime
  // prop — they narrow currentBlock to the entry block types (sub-page /
  // announcement) that carry the icon + rich-text name fields below.
  if (
    !currentBlock ||
    currentBlock.type !== blockType ||
    (currentBlock.type !== ResourceCenterBlockType.SUB_PAGE &&
      currentBlock.type !== ResourceCenterBlockType.ANNOUNCEMENT)
  ) {
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
          <Callout variant="info">{t(infoKey)}</Callout>

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
                  className="bg-surface dark:bg-surface-raised/50 text-sm shadow-none rounded-lg"
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

const EntryPanelFooter = () => {
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

export const ResourceCenterBlockEntryPanel = (props: ResourceCenterBlockEntryPanelProps) => {
  const { blockType, titleKey, infoKey } = props;
  return (
    <FloatingSidebarPanel width={320}>
      <EntryPanelHeader blockType={blockType} titleKey={titleKey} infoKey={infoKey} />
      <EntryPanelBody blockType={blockType} titleKey={titleKey} infoKey={infoKey} />
      <EntryPanelFooter />
    </FloatingSidebarPanel>
  );
};

ResourceCenterBlockEntryPanel.displayName = 'ResourceCenterBlockEntryPanel';
