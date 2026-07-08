import { memo } from 'react';
import { LauncherIconSource, ResourceCenterBlockType } from '@usertour/types';
import { cn } from '@usertour/tailwind';
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

// No overflow-hidden: it would clip the unread count badge hanging off the
// icon's corner; the label truncates via its own `truncate` class.
const tabItemBase = cn(
  'flex flex-1 flex-col items-center justify-center',
  'cursor-pointer',
  'm-1 rounded-none',
  'transition-all duration-150 ease-in-out',
  'text-sm leading-tight',
  'min-w-0 border-0 bg-transparent px-1.5',
);

// ============================================================================
// Tab bar component
// ============================================================================

export const ResourceCenterTabBar = memo(() => {
  const { visibleTabs, nav, actions, showTabBar, badgeCount } = useResourceCenterContext();

  if (!showTabBar) return null;

  // If there's only one tab (Home), no tab bar needed
  if (visibleTabs.length <= 1) return null;

  return (
    <div
      className={cn(
        'relative z-30 order-3 shrink-0 border-t border-sdk-foreground/10',
        'group-data-[animate-frame=true]:transition-opacity',
        'group-data-[animate-frame=true]:duration-sdk-resource-center',
        'group-data-[state=closed]:absolute group-data-[state=closed]:invisible group-data-[state=closed]:opacity-0',
      )}
    >
      <div className={cn('flex h-[60px] flex-row items-stretch justify-between', 'px-1')}>
        {/* All tabs render from their own data — the Home tab (first) is no
            special case beyond its fallback label, so the name/icon set in
            the builder show up here. */}
        {visibleTabs.map((tab, index) => {
          // Unread count on the tab holding the announcement block: with the
          // panel open, this is the only in-panel pointer to unread
          // announcements — a single-block tab auto-expands, so the row badge
          // never renders, and the launcher badge is hidden while expanded.
          // Mirrors the launcher badge (same count, same theme colors), sized
          // down for the tab bar.
          const hasUnreadAnnouncements =
            badgeCount > 0 &&
            tab.blocks.some((block) => block.type === ResourceCenterBlockType.ANNOUNCEMENT);
          return (
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
              {/* inline-flex (not plain inline): an inline wrapper's box follows
                  the line height, not the 20px icon, which would sink the badge
                  to the icon's lower right. inline-flex shrink-wraps the icon so
                  the badge anchors to its actual corner. */}
              <span className="relative inline-flex">
                <TabBarIcon tab={tab} isActive={nav.activeTabId === tab.id} />
                {hasUnreadAnnouncements && (
                  // Perch on the icon's top-right corner: pushed far enough out
                  // (-top-2 / -right-2 with a 14px pill) that only a small
                  // corner overlaps, instead of covering the glyph.
                  <span
                    className={cn(
                      'absolute -right-2 -top-2',
                      'flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1',
                      'text-[9px] font-bold leading-none',
                      'bg-sdk-resource-center-badge-background text-sdk-resource-center-badge-foreground',
                    )}
                  >
                    {badgeCount}
                  </span>
                )}
              </span>
              <span className="truncate max-w-full text-sm">
                {tab.name || (index === 0 ? 'Home' : 'Untitled')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

ResourceCenterTabBar.displayName = 'ResourceCenterTabBar';
