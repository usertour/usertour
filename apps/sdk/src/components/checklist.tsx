import { AssetAttributes } from '@usertour-packages/frame';
import { PopperMadeWith } from '@usertour-packages/sdk';
import { ChecklistProgress } from '@usertour-packages/sdk';
import {
  ChecklistDismiss,
  ChecklistDropdown,
  ChecklistItems,
  ChecklistPopperContentBody,
  ChecklistPopperUseIframe,
  ChecklistRoot,
} from '@usertour-packages/sdk/src/checklist';
import {
  ContentEditorClickableElement,
  ContentEditorSerialize,
} from '@usertour-packages/shared-editor';
import {
  BizUserInfo,
  ChecklistData,
  ChecklistItemType,
  ThemeTypesSetting,
} from '@usertour-packages/types';
import { useSyncExternalStore } from 'react';
import { Checklist } from '../core/checklist';

// Types
type ChecklistWidgetProps = {
  checklist: Checklist;
};

type ChecklistWidgetCoreProps = {
  data: ChecklistData;
  themeSettings: ThemeTypesSetting;
  userInfo: BizUserInfo;
  assets: AssetAttributes[] | undefined;
  handleItemClick: (item: ChecklistItemType, index: number) => void;
  handleOnClick: ({ type, data }: ContentEditorClickableElement) => Promise<void>;
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
  themeSettings,
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
    themeSettings={themeSettings}
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

  const { checklistData, themeSettings, userInfo, openState, assets, sdkConfig, zIndex, expanded } =
    store;

  if (!themeSettings || !checklistData || !openState || !userInfo) {
    return <></>;
  }

  return (
    <ChecklistWidgetCore
      data={checklistData}
      themeSettings={themeSettings}
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
