'use client';

import { ChevronLeftIcon } from '@radix-ui/react-icons';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { EXTENSION_CONTENT_RULES } from '@usertour-packages/constants';
import { useAttributeListContext, useContentListContext } from '@usertour-packages/contexts';
import { SpinnerIcon } from '@usertour-packages/icons';
import { Label } from '@usertour-packages/label';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { Rules } from '@usertour-packages/shared-components';
import { useListEventsQuery, useSegmentListQuery } from '@usertour-packages/shared-hooks';
import { Switch } from '@usertour-packages/switch';
import { RulesCondition } from '@usertour/types';
import { BuilderMode, useBuilderContext, useResourceCenterContext } from '../../contexts';
import { useToken } from '../../hooks/use-token';
import { SidebarContainer } from '../sidebar';

const BlockMessageHeader = () => {
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
        <span className="truncate">Message block</span>
      </CardTitle>
    </CardHeader>
  );
};

const BlockMessageBody = () => {
  const { currentBlock, setCurrentBlock } = useResourceCenterContext();
  const { attributeList } = useAttributeListContext();
  const { contents } = useContentListContext();
  const { environmentId, projectId } = useBuilderContext();
  const { token } = useToken();
  const { segmentList } = useSegmentListQuery(environmentId);
  const { eventList } = useListEventsQuery(projectId);

  if (!currentBlock || currentBlock.type !== 'message') {
    return null;
  }

  const handleOnlyShowChange = (value: boolean) => {
    setCurrentBlock((prev) => (prev ? { ...prev, onlyShowTask: value } : null));
  };

  const handleConditionsChange = (value: RulesCondition[]) => {
    setCurrentBlock((prev) => (prev ? { ...prev, onlyShowTaskConditions: value } : null));
  };

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <div className="flex items-start space-x-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <InfoCircledIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <p className="text-sm text-blue-800">
              Edit message content by clicking on the content area in the preview.
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
                checked={currentBlock.onlyShowTask}
                onCheckedChange={handleOnlyShowChange}
              />
            </div>
            {currentBlock.onlyShowTask && (
              <Rules
                onDataChange={handleConditionsChange}
                defaultConditions={currentBlock.onlyShowTaskConditions ?? []}
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

const BlockMessageFooter = () => {
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

export const ResourceCenterBlockMessage = () => {
  return (
    <SidebarContainer>
      <BlockMessageHeader />
      <BlockMessageBody />
      <BlockMessageFooter />
    </SidebarContainer>
  );
};

ResourceCenterBlockMessage.displayName = 'ResourceCenterBlockMessage';
