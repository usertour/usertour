import {
  ChecklistItems,
  ChecklistProgress,
  ChecklistDismiss,
  ChecklistRoot,
  ChecklistPopperContentBody,
  ContentEditorSerialize,
  LinkDecoratorContext,
  ResourceCenterPanel,
  ResourceCenterRoot,
  ResourceCenterStyleProvider,
  ResourceCenterHeader,
  ResourceCenterBody,
  ResourceCenterBlocks,
  ResourceCenterTabBar,
  ResourceCenterFooter,
} from '@usertour-packages/widget';
import { useSyncExternalStore } from 'react';
import { UsertourChecklist } from '@/core/usertour-checklist';
import { UsertourResourceCenter } from '@/core/usertour-resource-center';

type ResourceCenterWidgetProps = {
  resourceCenter: UsertourResourceCenter;
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
    assets,
    contentListItems,
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
    assets,
    contentListItems,
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
      embedded={true}
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

export const ResourceCenterWidget = ({ resourceCenter }: ResourceCenterWidgetProps) => {
  const store = useResourceCenterStore(resourceCenter);

  if (!store) return <></>;

  const {
    resourceCenterData,
    themeSettings,
    userAttributes,
    zIndex,
    expanded,
    removeBranding,
    linkUrlDecorator,
    assets,
    contentListItems,
  } = store;

  if (!themeSettings || !resourceCenterData) return <></>;

  const { checklist, launcherText, badgeCount, uncompletedCount } =
    resourceCenter.getChecklistPresentation();

  const checklistSlot = checklist ? <EmbeddedChecklistSlot checklist={checklist} /> : undefined;

  return (
    <LinkDecoratorContext.Provider value={linkUrlDecorator || null}>
      <ResourceCenterRoot
        data={resourceCenterData}
        themeSettings={themeSettings}
        launcherText={launcherText}
        badgeCount={badgeCount}
        uncompletedCount={uncompletedCount}
        expanded={expanded}
        onExpandedChange={resourceCenter.expand}
        zIndex={zIndex}
        userAttributes={userAttributes}
        onContentClick={resourceCenter.handleOnClick}
        onBlockClick={resourceCenter.handleBlockClick}
        onLiveChatClick={resourceCenter.handleLiveChatClick}
        showMadeWith={!removeBranding}
        checklistSlot={checklistSlot}
        contentListItems={contentListItems ?? []}
        onContentListNavigate={resourceCenter.handleContentListNavigate}
        onContentListItemClick={resourceCenter.handleContentListItemClick}
      >
        <ResourceCenterStyleProvider>
          <ResourceCenterPanel mode="iframe" assets={assets}>
            <ResourceCenterHeader />
            <ResourceCenterBody>
              <ResourceCenterBlocks />
            </ResourceCenterBody>
            <ResourceCenterTabBar />
            <ResourceCenterFooter />
          </ResourceCenterPanel>
        </ResourceCenterStyleProvider>
      </ResourceCenterRoot>
    </LinkDecoratorContext.Provider>
  );
};
