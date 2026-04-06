import { memo } from 'react';
import { LauncherIconSource } from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';
import { RiHomeFill } from '@usertour-packages/icons';
import { useResourceCenterContext } from './context';
import type { TabBarBlock } from './context';
import { IconsList } from '../launcher';

const TabBarIcon = memo(({ block }: { block: TabBarBlock }) => {
  if (block.iconSource === LauncherIconSource.NONE) {
    return null;
  }
  if (
    (block.iconSource === LauncherIconSource.UPLOAD ||
      block.iconSource === LauncherIconSource.URL) &&
    block.iconUrl
  ) {
    return <img src={block.iconUrl} alt="" className="size-5 flex-shrink-0 object-contain" />;
  }
  if (block.iconSource === LauncherIconSource.BUILTIN && block.iconType) {
    const iconItem = IconsList.find((item) => item.name === block.iconType);
    if (iconItem) {
      const Icon = iconItem.ICON;
      return <Icon size={20} className="flex-shrink-0" />;
    }
  }
  return null;
});

TabBarIcon.displayName = 'TabBarIcon';

const tabItemBase = cn(
  'flex flex-1 flex-col items-center justify-center',
  'cursor-pointer overflow-hidden',
  'm-1 rounded-none',
  'transition-all duration-150 ease-in-out',
  'text-sm leading-tight',
  'min-w-0 border-0 bg-transparent px-1.5',
);

export const ResourceCenterTabBar = memo(() => {
  const { tabBarBlocks, activeTab, navigateToTab, hasTabBar, isSecondaryPage } =
    useResourceCenterContext();

  // Hide when no tab bar configured or when on a secondary (deeper) page
  if (!hasTabBar || isSecondaryPage) return null;

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
        <button
          type="button"
          className={cn(
            tabItemBase,
            activeTab === null
              ? 'text-sdk-btn-primary'
              : 'text-sdk-foreground/40 hover:text-sdk-foreground/70',
          )}
          onClick={() => navigateToTab(null)}
        >
          <RiHomeFill size={20} className="flex-shrink-0" />
          <span className="truncate max-w-full text-sm">Home</span>
        </button>

        {/* Dynamic tabs */}
        {tabBarBlocks.map((block) => (
          <button
            key={block.id}
            type="button"
            className={cn(
              tabItemBase,
              activeTab === block.id
                ? 'text-sdk-btn-primary'
                : 'text-sdk-foreground/40 hover:text-sdk-foreground/70',
            )}
            onClick={() => navigateToTab(block.id)}
          >
            <TabBarIcon block={block} />
            <span className="truncate max-w-full text-sm">{block.name || 'Untitled'}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

ResourceCenterTabBar.displayName = 'ResourceCenterTabBar';
