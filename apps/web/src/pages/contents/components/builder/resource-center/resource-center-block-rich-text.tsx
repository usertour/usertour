'use client';

import {
  Button,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
  ScrollArea,
  Switch,
} from '@usertour/ui';
import { BUILDER_Z } from '@usertour/constants';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '@/pages/contents/components/builder/hooks/use-content-list';
import { RiArrowLeftSLine, SpinnerIcon } from '@usertour/icons';
import { Callout } from '@/pages/contents/components/builder/shared/callout';
import { Conditions } from '@usertour/business-components';
import { useListEventsQuery, useSegmentListQuery } from '@usertour/hooks';
import { ResourceCenterBlockType, RulesCondition } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useEnvironmentId, useProjectId } from '@/pages/contents/components/builder/core';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import { useConditionsSaveGate } from '@/pages/contents/components/builder/hooks/use-conditions-save-gate';
import { useToken } from '@/pages/contents/components/builder/hooks/use-token';
import { FloatingSidebarPanel } from '@/pages/contents/components/builder/components/sidebar';

const BlockRichTextHeader = () => {
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
        <span className="truncate">{t('contentBuilder.resourceCenter.richTextBlock')}</span>
      </CardTitle>
    </CardHeader>
  );
};

const BlockRichTextBody = () => {
  const { currentBlock, setCurrentBlock } = useResourceCenterEditor();
  const { attributeList } = useAttributeList();
  const { contents } = useContentList();
  const environmentId = useEnvironmentId();
  const projectId = useProjectId();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);
  const { t } = useTranslation();

  if (!currentBlock || currentBlock.type !== ResourceCenterBlockType.RICH_TEXT) {
    return null;
  }

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
          <Callout variant="info">{t('contentBuilder.resourceCenter.richTextInfo')}</Callout>

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

const BlockRichTextFooter = () => {
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

export const ResourceCenterBlockRichText = () => {
  return (
    <FloatingSidebarPanel width={320}>
      <BlockRichTextHeader />
      <BlockRichTextBody />
      <BlockRichTextFooter />
    </FloatingSidebarPanel>
  );
};

ResourceCenterBlockRichText.displayName = 'ResourceCenterBlockRichText';
