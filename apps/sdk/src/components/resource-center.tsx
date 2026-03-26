import {
  ChecklistItems,
  ChecklistProgress,
  ChecklistDismiss,
  ChecklistRoot,
  ChecklistPopperContentBody,
  ContentEditorSerialize,
  LinkDecoratorContext,
  ResourceCenterFrame,
  ResourceCenterRoot,
  ResourceCenterHeader,
  ResourceCenterBody,
  ResourceCenterBlocks,
  ResourceCenterFooter,
} from '@usertour-packages/widget';
import { ResourceCenterBlockType } from '@usertour/types';
import { useSyncExternalStore } from 'react';
import { UsertourChecklist } from '@/core/usertour-checklist';
import { UsertourResourceCenter } from '@/core/usertour-resource-center';

type ResourceCenterWidgetProps = {
  resourceCenter: UsertourResourceCenter;
  checklists?: UsertourChecklist[];
};

const useResourceCenterStore = (rc: UsertourResourceCenter) => {
  const store = useSyncExternalStore(rc.subscribe, rc.getSnapshot);

  if (!store) return null;

  const {
    userAttributes,
    resourceCenterData,
    expanded,
    openState,
    zIndex,
    themeSettings,
    removeBranding,
    linkUrlDecorator,
  } = store;

  if (!resourceCenterData || !openState) return null;

  return {
    userAttributes,
    resourceCenterData,
    expanded,
    openState,
    zIndex,
    themeSettings,
    removeBranding,
    linkUrlDecorator,
  };
};

/** Subscribe to one checklist's store and return its data if active */
const useChecklistStore = (checklist: UsertourChecklist | undefined) => {
  const store = useSyncExternalStore(
    checklist?.subscribe ?? (() => () => {}),
    checklist?.getSnapshot ?? (() => undefined),
  );
  if (!store?.checklistData || !store.openState) return null;
  return store;
};

/** Inline checklist content rendered inside the RC panel */
const EmbeddedChecklistSlot = ({ checklist }: { checklist: UsertourChecklist }) => {
  const store = useChecklistStore(checklist);
  if (!store) return null;

  const { checklistData, themeSettings, userAttributes } = store;
  if (!checklistData || !themeSettings) return null;

  return (
    <ChecklistRoot
      data={checklistData}
      themeSettings={themeSettings}
      expanded={true}
      onExpandedChange={checklist.handleExpandedChange}
      onDismiss={checklist.handleDismiss}
      zIndex={0}
    >
      <ChecklistPopperContentBody>
        <ContentEditorSerialize
          contents={checklistData.content}
          onClick={checklist.handleOnClick}
          userAttributes={userAttributes}
        />
        <ChecklistProgress />
        <ChecklistItems onClick={checklist.handleItemClick} disabledUpdate={true} />
        <ChecklistDismiss onAutoDismiss={checklist.handleAutoDismiss} />
      </ChecklistPopperContentBody>
    </ChecklistRoot>
  );
};

export const ResourceCenterWidget = ({ resourceCenter, checklists }: ResourceCenterWidgetProps) => {
  const store = useResourceCenterStore(resourceCenter);

  // Find the first active checklist for embedding
  const activeChecklist = checklists?.[0];
  const checklistStore = useChecklistStore(activeChecklist);

  if (!store) return <></>;

  const {
    resourceCenterData,
    themeSettings,
    userAttributes,
    zIndex,
    expanded,
    removeBranding,
    linkUrlDecorator,
  } = store;

  if (!themeSettings || !resourceCenterData) return <></>;

  const hasChecklistBlock = resourceCenterData.blocks.some(
    (b) => b.type === ResourceCenterBlockType.CHECKLIST,
  );

  // Build checklistSlot for embedding
  const checklistSlot =
    hasChecklistBlock && activeChecklist ? (
      <EmbeddedChecklistSlot checklist={activeChecklist} />
    ) : undefined;

  // Launcher text: show checklist button text when active checklist is embedded
  const launcherText =
    hasChecklistBlock && checklistStore?.checklistData?.buttonText
      ? checklistStore.checklistData.buttonText
      : undefined;
  const badgeCount =
    hasChecklistBlock && themeSettings.resourceCenterLauncherButton?.showRemainingTasks
      ? (checklistStore?.checklistData?.items ?? []).filter(
          (item: any) => item?.isVisible !== false && !item?.isCompleted,
        ).length
      : 0;

  return (
    <LinkDecoratorContext.Provider value={linkUrlDecorator || null}>
      <ResourceCenterRoot
        data={resourceCenterData}
        themeSettings={themeSettings}
        expanded={expanded}
        onExpandedChange={resourceCenter.expand}
        zIndex={zIndex}
        userAttributes={userAttributes}
        onContentClick={resourceCenter.handleOnClick}
        showMadeWith={!removeBranding}
        checklistSlot={checklistSlot}
      >
        <ResourceCenterFrame launcherText={launcherText} badgeCount={badgeCount}>
          <ResourceCenterHeader text={resourceCenterData.headerText} />
          <ResourceCenterBody>
            <ResourceCenterBlocks />
          </ResourceCenterBody>
          <ResourceCenterFooter />
        </ResourceCenterFrame>
      </ResourceCenterRoot>
    </LinkDecoratorContext.Provider>
  );
};
