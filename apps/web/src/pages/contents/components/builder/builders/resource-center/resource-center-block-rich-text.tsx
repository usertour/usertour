'use client';

import { ChevronLeftIcon } from '@radix-ui/react-icons';
import { InfoCircledIcon } from '@radix-ui/react-icons';
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
import { EXTENSION_CONTENT_RULES } from '@usertour/constants';
import { useAttributeList } from '@/hooks/use-attribute-list';
import { useContentList } from '../../hooks/use-content-list';
import { SpinnerIcon } from '@usertour/icons';
import { Conditions } from '@usertour/business-components';
import { useListEventsQuery, useSegmentListQuery } from '@usertour/hooks';
import { ResourceCenterBlockType, RulesCondition } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useEnvironmentId, useProjectId } from '../../core';
import { useResourceCenterEditor } from './use-resource-center-editor';
import { useConditionsSaveGate } from '../../hooks/use-conditions-save-gate';
import { useToken } from '../../hooks/use-token';
import { SidebarContainer } from '../../components/sidebar';

const BlockMessageHeader = () => {
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
        <span className="truncate">Rich text block</span>
      </CardTitle>
    </CardHeader>
  );
};

const BlockMessageBody = () => {
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
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <div className="flex items-start space-x-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <InfoCircledIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <p className="text-sm text-blue-800">
              Edit rich text content by clicking on the content area in the preview.
            </p>
          </div>
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

const BlockMessageFooter = () => {
  const { saveCurrentBlock, currentBlock, isLoading } = useResourceCenterEditor();
  const gate = useConditionsSaveGate();
  const handleSave = () => {
    if (!gate(currentBlock?.onlyShowBlockConditions)) return;
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

export const ResourceCenterBlockRichText = () => {
  return (
    <SidebarContainer>
      <BlockMessageHeader />
      <BlockMessageBody />
      <BlockMessageFooter />
    </SidebarContainer>
  );
};

ResourceCenterBlockRichText.displayName = 'ResourceCenterBlockRichText';
