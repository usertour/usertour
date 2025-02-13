import { AssetAttributes } from '@usertour-ui/frame';
import { PopperMadeWith } from '@usertour-ui/sdk';
import { ChecklistProgress } from '@usertour-ui/sdk';
import {
  ChecklistDismiss,
  ChecklistDropdown,
  ChecklistItems,
  ChecklistPopperContentBody,
  ChecklistPopperUseIframe,
} from '@usertour-ui/sdk/src/checklist';
import { ChecklistRoot } from '@usertour-ui/sdk/src/checklist';
import { ContentEditorButtonElement, ContentEditorSerialize } from '@usertour-ui/shared-editor';
import {
  BizUserInfo,
  ChecklistData,
  ChecklistInitialDisplay,
  ChecklistItemType,
  Theme,
} from '@usertour-ui/types';
import { useSyncExternalStore } from 'react';
import { Checklist } from '../core/checklist';

type ChecklistProps = {
  checklist: Checklist;
};

interface ChecklistWidgetCoreProps {
  data: ChecklistData;
  theme: Theme;
  userInfo: BizUserInfo;
  assets: AssetAttributes[] | undefined;
  handleItemClick: (item: ChecklistItemType, index: number) => void;
  handleOnClick: ({ type, data }: ContentEditorButtonElement) => void;
  handleDismiss: () => Promise<void>;
  handleOpenChange: (open: boolean) => void;
}

const ChecklistWidgetCore = (props: ChecklistWidgetCoreProps) => {
  const {
    data,
    theme,
    userInfo,
    assets,
    handleItemClick,
    handleOnClick,
    handleDismiss,
    handleOpenChange,
  } = props;

  return (
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
          <ContentEditorSerialize
            contents={data.content}
            onClick={handleOnClick}
            userInfo={userInfo}
          />
          <ChecklistProgress />
          <ChecklistItems onClick={handleItemClick} disabledUpdate={true} />
          <ChecklistDismiss />
        </ChecklistPopperContentBody>
        <PopperMadeWith />
      </ChecklistPopperUseIframe>
    </ChecklistRoot>
  );
};

export const ChecklistWidget = (props: ChecklistProps) => {
  const { checklist } = props;

  const store = useSyncExternalStore(
    checklist.getStore().subscribe,
    checklist.getStore().getSnapshot,
  );
  const { content, theme, userInfo, openState, assets } = store;
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
    />
  );
};
