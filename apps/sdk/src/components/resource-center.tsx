import {
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
    liveChatActive,
    launcherHidden,
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
    removeBranding,
    linkUrlDecorator,
    assets,
    contentListItems,
    liveChatActive,
    launcherHidden,
  } = store;

  if (!themeSettings || !resourceCenterData) return <></>;

  return (
    <LinkDecoratorContext.Provider value={linkUrlDecorator || null}>
      <ResourceCenterRoot
        data={resourceCenterData}
        themeSettings={themeSettings}
        expanded={expanded}
        onExpandedChange={resourceCenter.expand}
        zIndex={zIndex}
        hidden={liveChatActive === true}
        launcherHidden={launcherHidden === true}
        userAttributes={userAttributes}
        onContentClick={resourceCenter.handleOnClick}
        onBlockClick={resourceCenter.handleBlockClick}
        showMadeWith={!removeBranding}
        contentListItems={contentListItems ?? []}
        onContentListNavigate={resourceCenter.handleContentListNavigate}
        onContentListItemClick={resourceCenter.handleContentListItemClick}
        onLiveChatClick={resourceCenter.handleLiveChatClick}
        onSearchKnowledgeBase={(blockId, query, offset) =>
          resourceCenter.searchKnowledgeBase(blockId, query, offset)
        }
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
