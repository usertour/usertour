import { memo } from 'react';
import { LauncherIconSource } from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';
import { useResourceCenterContext } from './context';
import type { TabBarBlock } from './context';
import { IconsList } from '../launcher';

const HomeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="size-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12l8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  </svg>
);

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
        'absolute inset-x-4 bottom-4 z-20',
        'group-data-[animate-frame=true]:transition-opacity',
        'group-data-[animate-frame=true]:duration-sdk-resource-center',
        'group-data-[state=closed]:absolute group-data-[state=closed]:invisible group-data-[state=closed]:opacity-0',
      )}
    >
      {/* Pill container */}
      <div
        className={cn(
          'flex h-[60px] flex-row items-stretch justify-between',
          'rounded-[60px] px-1',
          'border border-white/20',
          'bg-white/[0.10]',
          '[backdrop-filter:blur(5px)_saturate(180%)] [-webkit-backdrop-filter:blur(5px)_saturate(180%)]',
          'shadow-[0_0_1px_1px_rgba(0,0,0,0.05),0_0_25px_rgba(0,0,0,0.05)]',
        )}
      >
        {/* Home tab */}
        <button
          type="button"
          className={cn(
            tabItemBase,
            activeTab === null
              ? 'text-sdk-foreground bg-white/20'
              : 'text-sdk-foreground/40 hover:text-sdk-foreground/70 hover:bg-white/10',
          )}
          onClick={() => navigateToTab(null)}
        >
          <HomeIcon />
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
                ? 'text-sdk-foreground bg-white/20'
                : 'text-sdk-foreground/40 hover:text-sdk-foreground/70 hover:bg-white/10',
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
