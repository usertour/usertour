import { AssetAttributes } from '@usertour-ui/frame';
import { PopperMadeWith } from '@usertour-ui/sdk';
import { ChecklistProgress } from '@usertour-ui/sdk';
import {
  ChecklistDismiss,
  ChecklistDropdown,
  ChecklistItems,
  ChecklistPopperContentBody,
  ChecklistPopperUseIframe,
  ChecklistRoot,
} from '@usertour-ui/sdk/src/checklist';
import { ContentEditorClickableElement, ContentEditorSerialize } from '@usertour-ui/shared-editor';
import { BizUserInfo, ChecklistData, ChecklistItemType, Theme } from '@usertour-ui/types';
import { useSyncExternalStore } from 'react';
import { Checklist } from '../core/checklist';

// Types
type ChecklistWidgetProps = {
  checklist: Checklist;
};

type ChecklistWidgetCoreProps = {
  data: ChecklistData;
  theme: Theme;
  userInfo: BizUserInfo;
  assets: AssetAttributes[] | undefined;
  handleItemClick: (item: ChecklistItemType, index: number) => void;
  handleOnClick: ({ type, data }: ContentEditorClickableElement) => void;
  handleDismiss: () => Promise<void>;
  handleExpandedChange: (expanded: boolean) => void;
  reportExpandedChangeEvent: (expanded: boolean) => Promise<void>;
  removeBranding: boolean;
  zIndex: number;
  expanded: boolean;
};

// Components
const ChecklistContent = ({
  data,
  userInfo,
  handleOnClick,
  handleItemClick,
}: Pick<ChecklistWidgetCoreProps, 'data' | 'userInfo' | 'handleOnClick' | 'handleItemClick'>) => (
  <>
    <ContentEditorSerialize contents={data.content} onClick={handleOnClick} userInfo={userInfo} />
    <ChecklistProgress />
    <ChecklistItems onClick={handleItemClick} disabledUpdate={true} />
    <ChecklistDismiss />
  </>
);

const ChecklistWidgetCore = ({
  data,
  theme,
  userInfo,
  assets,
  handleItemClick,
  handleOnClick,
  handleDismiss,
  handleExpandedChange,
  reportExpandedChangeEvent,
  removeBranding,
  zIndex,
  expanded,
}: ChecklistWidgetCoreProps) => (
  <ChecklistRoot
    data={data}
    theme={theme}
    expanded={expanded}
    onDismiss={handleDismiss}
    onExpandedChange={handleExpandedChange}
    reportExpandedChangeEvent={reportExpandedChangeEvent}
    zIndex={zIndex}
  >
    <ChecklistPopperUseIframe zIndex={zIndex} assets={assets}>
      <ChecklistDropdown />
      <ChecklistPopperContentBody>
        <ChecklistContent
          data={data}
          userInfo={userInfo}
          handleOnClick={handleOnClick}
          handleItemClick={handleItemClick}
        />
      </ChecklistPopperContentBody>
      {!removeBranding && <PopperMadeWith />}
    </ChecklistPopperUseIframe>
  </ChecklistRoot>
);

export const ChecklistWidget = ({ checklist }: ChecklistWidgetProps) => {
  const store = useSyncExternalStore(
    checklist.getStore().subscribe,
    checklist.getStore().getSnapshot,
  );

  if (!store) {
    return <></>;
  }

  const { checklistData, theme, userInfo, openState, assets, sdkConfig, zIndex, expanded } = store;

  if (!theme || !checklistData || !openState || !userInfo) {
    return <></>;
  }

  return (
    <ChecklistWidgetCore
      data={checklistData}
      theme={theme}
      userInfo={userInfo}
      assets={assets}
      handleItemClick={checklist.handleItemClick}
      handleOnClick={checklist.handleOnClick}
      handleDismiss={checklist.handleDismiss}
      handleExpandedChange={checklist.handleExpandedChange}
      reportExpandedChangeEvent={checklist.reportExpandedChangeEvent}
      removeBranding={sdkConfig.removeBranding}
      zIndex={zIndex}
      expanded={expanded}
    />
  );
};
