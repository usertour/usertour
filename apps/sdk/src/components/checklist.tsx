import { AssetAttributes } from '@usertour-packages/frame';
import {
  ContentEditorSerialize,
  PopperMadeWith,
  ChecklistProgress,
  ChecklistDismiss,
  ChecklistDropdown,
  ChecklistItems,
  ChecklistPopperContentBody,
  ChecklistPopperUseIframe,
  ChecklistRoot,
} from '@usertour-packages/widget';
import {
  ChecklistData,
  ChecklistItemType,
  ContentEditorClickableElement,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';
import { useSyncExternalStore } from 'react';
import { UsertourChecklist } from '@/core/usertour-checklist';

// Types
type ChecklistWidgetProps = {
  checklist: UsertourChecklist;
};

type ChecklistWidgetCoreProps = {
  data: ChecklistData;
  themeSettings: ThemeTypesSetting;
  userAttributes?: UserTourTypes.Attributes;
  assets: AssetAttributes[] | undefined;
  handleItemClick: (item: ChecklistItemType, index: number) => void;
  handleOnClick: ({ type, data }: ContentEditorClickableElement) => Promise<void>;
  handleDismiss: () => Promise<void>;
  handleExpandedChange: (expanded: boolean) => Promise<void>;
  handleAutoDismiss: () => Promise<void>;
  removeBranding: boolean;
  zIndex: number;
  expanded: boolean;
};

// Custom hook to extract store state
const useChecklistStore = (checklist: UsertourChecklist) => {
  const store = useSyncExternalStore(checklist.subscribe, checklist.getSnapshot);

  if (!store) {
    return null;
  }

  const {
    userAttributes,
    checklistData,
    expanded,
    openState,
    zIndex,
    globalStyle,
    themeSettings,
    assets,
    removeBranding,
  } = store;

  if (!checklistData || !openState) {
    return null;
  }

  return {
    userAttributes,
    checklistData,
    expanded,
    openState,
    zIndex,
    globalStyle,
    themeSettings,
    assets,
    removeBranding,
  };
};

// Components
const ChecklistContent = ({
  data,
  userAttributes,
  handleOnClick,
  handleItemClick,
  handleAutoDismiss,
}: Pick<
  ChecklistWidgetCoreProps,
  'data' | 'userAttributes' | 'handleOnClick' | 'handleItemClick' | 'handleAutoDismiss'
>) => (
  <>
    <ContentEditorSerialize
      contents={data.content}
      onClick={handleOnClick}
      userAttributes={userAttributes}
    />
    <ChecklistProgress />
    <ChecklistItems onClick={handleItemClick} disabledUpdate={true} />
    <ChecklistDismiss onAutoDismiss={handleAutoDismiss} />
  </>
);

const ChecklistWidgetCore = ({
  data,
  themeSettings,
  userAttributes,
  assets,
  handleItemClick,
  handleOnClick,
  handleDismiss,
  handleExpandedChange,
  removeBranding,
  zIndex,
  expanded,
  handleAutoDismiss,
}: ChecklistWidgetCoreProps) => (
  <ChecklistRoot
    data={data}
    themeSettings={themeSettings}
    expanded={expanded}
    onDismiss={handleDismiss}
    onExpandedChange={handleExpandedChange}
    zIndex={zIndex}
  >
    <ChecklistPopperUseIframe zIndex={zIndex} assets={assets}>
      <ChecklistDropdown />
      <ChecklistPopperContentBody>
        <ChecklistContent
          data={data}
          userAttributes={userAttributes}
          handleOnClick={handleOnClick}
          handleItemClick={handleItemClick}
          handleAutoDismiss={handleAutoDismiss}
        />
      </ChecklistPopperContentBody>
      {!removeBranding && <PopperMadeWith />}
    </ChecklistPopperUseIframe>
  </ChecklistRoot>
);

export const ChecklistWidget = ({ checklist }: ChecklistWidgetProps) => {
  const store = useChecklistStore(checklist);

  if (!store) {
    return <></>;
  }

  const {
    checklistData,
    themeSettings,
    userAttributes,
    openState,
    assets,
    zIndex,
    expanded,
    removeBranding,
  } = store;

  if (!themeSettings || !checklistData || !openState || !userAttributes) {
    return <></>;
  }

  return (
    <ChecklistWidgetCore
      data={checklistData}
      themeSettings={themeSettings}
      userAttributes={userAttributes}
      assets={assets}
      handleItemClick={checklist.handleItemClick}
      handleOnClick={checklist.handleOnClick}
      handleDismiss={checklist.handleDismiss}
      handleExpandedChange={checklist.handleExpandedChange}
      removeBranding={removeBranding}
      zIndex={zIndex}
      expanded={expanded}
      handleAutoDismiss={checklist.handleAutoDismiss}
    />
  );
};
