import { AssetAttributes } from '@usertour-packages/frame';
import {
  PopperMadeWith,
  ChecklistProgress,
  ChecklistDismiss,
  ChecklistDropdown,
  ChecklistItems,
  ChecklistPopperContentBody,
  ChecklistPopperUseIframe,
  ChecklistRoot,
} from '@usertour-packages/sdk';
import {
  ContentEditorClickableElement,
  ContentEditorSerialize,
} from '@usertour-packages/shared-editor';
import {
  ChecklistData,
  ChecklistItemType,
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
  handleExpandedChange: (expanded: boolean) => void;
  reportExpandedChangeEvent: (expanded: boolean) => Promise<void>;
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
}: Pick<
  ChecklistWidgetCoreProps,
  'data' | 'userAttributes' | 'handleOnClick' | 'handleItemClick'
>) => (
  <>
    <ContentEditorSerialize
      contents={data.content}
      onClick={handleOnClick}
      userAttributes={userAttributes}
    />
    <ChecklistProgress />
    <ChecklistItems onClick={handleItemClick} disabledUpdate={true} />
    <ChecklistDismiss />
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
          userAttributes={userAttributes}
          handleOnClick={handleOnClick}
          handleItemClick={handleItemClick}
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
      reportExpandedChangeEvent={checklist.reportExpandedChangeEvent}
      removeBranding={removeBranding}
      zIndex={zIndex}
      expanded={expanded}
    />
  );
};
