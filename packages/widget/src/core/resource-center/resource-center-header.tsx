import { forwardRef, memo, useCallback, type HTMLAttributes } from 'react';
import { ArrowLeftIcon, DropDownIcon } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import { Button } from '../../primitives';
import { useResourceCenterContext } from './context';

// ============================================================================
// Close Button (was "Dropdown")
// ============================================================================

export const ResourceCenterCloseButton = forwardRef<
  HTMLButtonElement,
  HTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const { handleExpandedChange } = useResourceCenterContext();
  const { className, ...restProps } = props;

  const buttonClassName = cn(
    'rounded-lg inline-flex h-sdk-resource-center-header-button aspect-square items-center justify-center p-2',
    'text-sdk-resource-center-header-foreground',
    'hover:bg-sdk-resource-center-header-foreground/10',
    'active:bg-sdk-resource-center-header-foreground/24',
    'outline-none cursor-pointer',
    className,
  );

  const handleClick = useCallback(async () => {
    await handleExpandedChange(false);
  }, [handleExpandedChange]);

  return (
    <Button
      variant="custom"
      ref={ref}
      className={buttonClassName}
      onClick={handleClick}
      aria-label="Close resource center"
      {...restProps}
    >
      <DropDownIcon height={24} width={24} />
    </Button>
  );
});

ResourceCenterCloseButton.displayName = 'ResourceCenterCloseButton';

// ============================================================================
// Back Button (shown when navigated into a sub-page)
// ============================================================================

export const ResourceCenterBackButton = memo(() => {
  const { navigateBack } = useResourceCenterContext();

  const handleClick = useCallback(() => {
    navigateBack();
  }, [navigateBack]);

  return (
    <Button
      variant="custom"
      className={cn(
        'rounded-lg inline-flex h-sdk-resource-center-header-button items-center justify-center gap-2 p-2',
        'text-sdk-resource-center-header-foreground',
        'hover:bg-sdk-resource-center-header-foreground/10',
        'active:bg-sdk-resource-center-header-foreground/24',
        'outline-none cursor-pointer',
        'px-3',
      )}
      onClick={handleClick}
      aria-label="Back"
    >
      <ArrowLeftIcon height={18} width={18} />
      <span className="text-sm font-medium leading-none">Back</span>
    </Button>
  );
});

ResourceCenterBackButton.displayName = 'ResourceCenterBackButton';

// ============================================================================
// Header
// ============================================================================

/**
 * Home page header — rendered inside Body so it scrolls with content.
 * Matches Featurebase pattern: content area = header + blocks, all scrollable.
 */
export const ResourceCenterHomeHeader = memo(() => {
  const { data } = useResourceCenterContext();

  return (
    <div className="p-2 flex items-center bg-sdk-resource-center-header-background rounded-t-[inherit]">
      <div className="text-sdk-resource-center-header-foreground flex-1 pl-4 text-lg">
        {data.headerText}
      </div>
      <ResourceCenterCloseButton />
    </div>
  );
});

ResourceCenterHomeHeader.displayName = 'ResourceCenterHomeHeader';

/**
 * Header — renders only on non-Home pages (tab pages, secondary pages).
 * On Home, returns null because HomeHeader is rendered inside Body.
 */
export const ResourceCenterHeader = memo(() => {
  const { data, isSecondaryPage, activeTab, tabBarBlocks } = useResourceCenterContext();

  const isHomePage = !isSecondaryPage && activeTab === null;
  if (isHomePage) return null;

  // Determine the title for tab pages
  const activeTabBlock = activeTab !== null ? tabBarBlocks.find((b) => b.id === activeTab) : null;
  const isTabPage = activeTabBlock !== null && activeTabBlock !== undefined;

  return (
    <div
      className={cn(
        'order-1 shrink-0 p-2 flex items-center bg-sdk-resource-center-header-background rounded-t-[inherit]',
        'group-data-[animate-frame=true]:transition-opacity',
        'group-data-[animate-frame=true]:duration-sdk-resource-center',
        'group-data-[state=closed]:absolute group-data-[state=closed]:invisible group-data-[state=closed]:opacity-0',
      )}
    >
      {isSecondaryPage && <ResourceCenterBackButton />}
      {!isSecondaryPage && (
        <div className="text-sdk-resource-center-header-foreground flex-1 pl-4 text-lg">
          {isTabPage ? activeTabBlock.name || data.headerText : data.headerText}
        </div>
      )}
      {isSecondaryPage && <div className="flex-1" />}
      <ResourceCenterCloseButton />
    </div>
  );
});

ResourceCenterHeader.displayName = 'ResourceCenterHeader';
