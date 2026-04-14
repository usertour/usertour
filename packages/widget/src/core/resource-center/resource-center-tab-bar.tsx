import { memo } from 'react';
import { LauncherIconSource } from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';
import { RiHomeFill } from '@usertour-packages/icons';
import { useResourceCenterContext } from './context';
import type { ResourceCenterTab } from '@usertour/types';
import { IconsList } from '../launcher';

// ============================================================================
// Tab icon
// ============================================================================

const TabBarIcon = memo(({ tab, isActive }: { tab: ResourceCenterTab; isActive: boolean }) => {
  if (tab.iconSource === LauncherIconSource.NONE) {
    return null;
  }
  if (
    (tab.iconSource === LauncherIconSource.UPLOAD || tab.iconSource === LauncherIconSource.URL) &&
    tab.iconUrl
  ) {
    return (
      <img
        src={tab.iconUrl}
        alt=""
        className={cn('size-5 flex-shrink-0 object-contain', !isActive && 'opacity-40')}
      />
    );
  }
  if (tab.iconSource === LauncherIconSource.BUILTIN && tab.iconType) {
    const iconItem = IconsList.find((item) => item.name === tab.iconType);
    if (iconItem) {
      const Icon = iconItem.ICON;
      return <Icon size={20} className="flex-shrink-0" />;
    }
  }
  return null;
});

TabBarIcon.displayName = 'TabBarIcon';

// ============================================================================
// Tab bar styles
// ============================================================================

const tabItemBase = cn(
  'flex flex-1 flex-col items-center justify-center',
  'cursor-pointer overflow-hidden',
  'm-1 rounded-none',
  'transition-all duration-150 ease-in-out',
  'text-sm leading-tight',
  'min-w-0 border-0 bg-transparent px-1.5',
);

// ============================================================================
// Tab bar component
// ============================================================================

export const ResourceCenterTabBar = memo(() => {
  const { data, nav, actions, showTabBar } = useResourceCenterContext();

  if (!showTabBar) return null;

  const tabs = data.tabs;
  const homeTab = tabs[0];
  const otherTabs = tabs.slice(1);

  // If there's only one tab (Home), no tab bar needed
  if (otherTabs.length === 0) return null;

  return (
    <div
      className={cn(
        'order-3 shrink-0 border-t border-sdk-foreground/10',
        'group-data-[animate-frame=true]:transition-opacity',
        'group-data-[animate-frame=true]:duration-sdk-resource-center',
        'group-data-[state=closed]:absolute group-data-[state=closed]:invisible group-data-[state=closed]:opacity-0',
      )}
    >
      <div className={cn('flex h-[60px] flex-row items-stretch justify-between', 'px-1')}>
        {/* Home tab */}
        {homeTab && (
          <button
            type="button"
            className={cn(
              tabItemBase,
              nav.activeTabId === homeTab.id
                ? 'text-sdk-brand-background'
                : 'text-sdk-foreground/40 hover:text-sdk-foreground/70',
            )}
            onClick={() => actions.switchTab(homeTab.id)}
          >
            <RiHomeFill size={20} className="flex-shrink-0" />
            <span className="truncate max-w-full text-sm">Home</span>
          </button>
        )}

        {/* Other tabs */}
        {otherTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              tabItemBase,
              nav.activeTabId === tab.id
                ? 'text-sdk-brand-background'
                : 'text-sdk-foreground/40 hover:text-sdk-foreground/70',
            )}
            onClick={() => actions.switchTab(tab.id)}
          >
            <TabBarIcon tab={tab} isActive={nav.activeTabId === tab.id} />
            <span className="truncate max-w-full text-sm">{tab.name || 'Untitled'}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

ResourceCenterTabBar.displayName = 'ResourceCenterTabBar';
