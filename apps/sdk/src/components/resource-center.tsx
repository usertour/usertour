import {
  LinkDecoratorContext,
  ResourceCenterAnnouncementPopup,
  ResourceCenterPanel,
  ResourceCenterRoot,
  ResourceCenterStyleProvider,
  ResourceCenterHeader,
  ResourceCenterBody,
  ResourceCenterBlocks,
  ResourceCenterTabBar,
  ResourceCenterFooter,
} from '@usertour/widget';
import { useSyncExternalStore } from 'react';
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
    initialNav,
    openState,
    zIndex,
    themeSettings,
    removeBranding,
    linkUrlDecorator,
    assets,
    contentListItems,
    contentListLoading,
    contentListError,
    liveChatActive,
    launcherHidden,
  } = store;

  if (!resourceCenterData || !openState) return null;

  return {
    userAttributes,
    resourceCenterData,
    expanded,
    initialNav,
    openState,
    zIndex,
    themeSettings,
    removeBranding,
    linkUrlDecorator,
    assets,
    contentListItems,
    contentListLoading,
    contentListError,
    liveChatActive,
    launcherHidden,
  };
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
    initialNav,
    removeBranding,
    linkUrlDecorator,
    assets,
    contentListItems,
    contentListLoading,
    contentListError,
    liveChatActive,
    launcherHidden,
  } = store;

  if (!themeSettings || !resourceCenterData) return <></>;

  // The popup announcement self-presents only while the launcher surface is
  // actually visible and idle: not with the panel open (opening the feed marks
  // everything seen anyway), not when the launcher is hidden (the bubble has
  // nothing to anchor to), and not while a live chat provider owns the corner.
  const popupAnnouncement =
    !expanded && !launcherHidden && liveChatActive !== true
      ? resourceCenterData.popupAnnouncement
      : undefined;

  return (
    <LinkDecoratorContext.Provider value={linkUrlDecorator || null}>
      <ResourceCenterRoot
        data={resourceCenterData}
        themeSettings={themeSettings}
        badgeCount={resourceCenter.getAnnouncementBadgeCount()}
        expanded={expanded}
        onExpandedChange={resourceCenter.expand}
        initialNav={initialNav}
        onNavChange={resourceCenter.persistNavState}
        zIndex={zIndex}
        hidden={liveChatActive === true}
        launcherHidden={launcherHidden === true}
        userAttributes={userAttributes}
        onContentClick={resourceCenter.handleOnClick}
        onBlockClick={resourceCenter.handleBlockClick}
        showMadeWith={!removeBranding}
        contentListItems={contentListItems ?? []}
        contentListLoading={contentListLoading === true}
        contentListError={contentListError === true}
        onContentListNavigate={resourceCenter.handleContentListNavigate}
        onContentListItemClick={resourceCenter.handleContentListItemClick}
        onLiveChatClick={resourceCenter.handleLiveChatClick}
        onListAnnouncements={() => resourceCenter.listAnnouncements()}
        onGetAnnouncement={(contentId) => resourceCenter.getAnnouncement(contentId)}
        onMarkAnnouncementsSeen={(items) => resourceCenter.markAnnouncementsSeen(items)}
        popupAnnouncement={popupAnnouncement}
        onPopupDismiss={() => resourceCenter.dismissPopupAnnouncement()}
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
          {/* Lives in the RC stage (one stage per widget instance); its
              shells are context-free primitives, so no nested stage. */}
          <ResourceCenterAnnouncementPopup assets={assets} />
        </ResourceCenterStyleProvider>
      </ResourceCenterRoot>
    </LinkDecoratorContext.Provider>
  );
};
