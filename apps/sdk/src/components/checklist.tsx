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
import {
  BizUserInfo,
  ChecklistData,
  ChecklistInitialDisplay,
  ChecklistItemType,
  Theme,
} from '@usertour-ui/types';
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
  handleOpenChange: (open: boolean) => void;
  removeBranding: boolean;
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
  handleOpenChange,
  removeBranding,
}: ChecklistWidgetCoreProps) => (
  <ChecklistRoot
    data={data}
    theme={theme}
    defaultOpen={data.initialDisplay === ChecklistInitialDisplay.EXPANDED}
    onDismiss={handleDismiss}
    onOpenChange={handleOpenChange}
  >
    <ChecklistPopperUseIframe zIndex={1111} assets={assets}>
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

  const { content, theme, userInfo, openState, assets, sdkConfig } = store;
  const data = content?.data as ChecklistData;

  if (!theme || !data || !openState || !userInfo) {
    return null;
  }

  return (
    <ChecklistWidgetCore
      data={data}
      theme={theme}
      userInfo={userInfo}
      assets={assets}
      handleItemClick={checklist.handleItemClick}
      handleOnClick={checklist.handleOnClick}
      handleDismiss={checklist.handleDismiss}
      handleOpenChange={checklist.handleOpenChange}
      removeBranding={sdkConfig.removeBranding}
    />
  );
};
