import { forwardRef, memo, useCallback, useMemo, type HTMLAttributes } from 'react';
import { ArrowLeftIcon, DropDownIcon } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import { ResourceCenterBlockType } from '@usertour/types';
import type { ResourceCenterContentListBlock } from '@usertour/types';
import { Button } from '../../primitives';
import { useResourceCenterContext } from './context';
import { serializeBlockName } from '@usertour/helpers';

// ============================================================================
// Close Button
// ============================================================================

export const ResourceCenterCloseButton = forwardRef<
  HTMLButtonElement,
  HTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const { handleExpandedChange } = useResourceCenterContext();
  const { className, ...restProps } = props;

  const buttonClassName = cn(
    'rounded-lg inline-flex h-sdk-resource-center-header-button aspect-square items-center justify-center p-2',
    'text-sdk-brand-foreground',
    'hover:bg-sdk-brand-foreground/10',
    'active:bg-sdk-brand-foreground/24',
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
// Back Button
// ============================================================================

export const ResourceCenterBackButton = memo(() => {
  const { actions } = useResourceCenterContext();

  const handleClick = useCallback(() => {
    actions.pop();
  }, [actions]);

  return (
    <Button
      variant="custom"
      className={cn(
        'rounded-lg inline-flex h-sdk-resource-center-header-button items-center justify-center gap-2 p-2',
        'text-sdk-brand-foreground',
        'hover:bg-sdk-brand-foreground/10',
        'active:bg-sdk-brand-foreground/24',
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
// Header — renders on all pages (Home, tab pages, detail pages)
// ============================================================================

export const ResourceCenterHeader = memo(() => {
  const {
    data,
    showBackButton,
    currentPage,
    autoExpandedPage,
    currentTab,
    nav,
    userAttributes,
    searchQuery,
    setSearchQuery,
    themeSetting,
  } = useResourceCenterContext();

  const isHeaderNone = themeSetting.resourceCenter?.headerBackground?.type === 'none';

  // Determine if search should be shown for the active page
  const activePage = currentPage ?? autoExpandedPage;
  const showSearch = useMemo(() => {
    if (!activePage) return false;
    if (activePage.type === ResourceCenterBlockType.KNOWLEDGE_BASE) return true;
    if (activePage.type === ResourceCenterBlockType.CONTENT_LIST) {
      return (activePage.block as ResourceCenterContentListBlock).showSearchField;
    }
    return false;
  }, [activePage]);

  const isHomePage =
    !showBackButton && !autoExpandedPage && nav.activeTabId === (data.tabs[0]?.id ?? '');

  // Home page: only show header when background type is 'none'
  if (isHomePage && !isHeaderNone) return null;

  // Home + none: left-aligned headerText + close button, using brand colors (same as tab page)
  if (isHomePage && isHeaderNone) {
    return (
      <div
        className={cn(
          'order-1 shrink-0 p-2 flex items-center bg-sdk-brand-background rounded-t-[inherit]',
          'group-data-[animate-frame=true]:transition-opacity',
          'group-data-[animate-frame=true]:duration-sdk-resource-center',
          'group-data-[state=closed]:absolute group-data-[state=closed]:invisible group-data-[state=closed]:opacity-0',
        )}
      >
        <div className="flex-1 pl-4 text-sdk-brand-foreground text-lg">{data.headerText}</div>
        <ResourceCenterCloseButton />
      </div>
    );
  }

  // Non-Home pages: back/title/close layout
  const title = currentPage
    ? serializeBlockName(currentPage.block.name, userAttributes)
    : autoExpandedPage
      ? serializeBlockName(autoExpandedPage.block.name, userAttributes)
      : (currentTab?.name ?? data.headerText);

  return (
    <div
      className={cn(
        'order-1 shrink-0 p-2 flex flex-col bg-sdk-brand-background rounded-t-[inherit]',
        'group-data-[animate-frame=true]:transition-opacity',
        'group-data-[animate-frame=true]:duration-sdk-resource-center',
        'group-data-[state=closed]:absolute group-data-[state=closed]:invisible group-data-[state=closed]:opacity-0',
      )}
    >
      <div className="flex items-center">
        <div className="w-24 shrink-0 flex items-center">
          {showBackButton ? <ResourceCenterBackButton /> : <div className="pl-4" />}
        </div>
        <div className="flex-1 min-w-0 px-2 text-sdk-brand-foreground text-lg truncate text-center">
          {title}
        </div>
        <div className="w-24 shrink-0 flex items-center justify-end">
          <ResourceCenterCloseButton />
        </div>
      </div>
      {showSearch && (
        <div className="px-2 pb-1 pt-1">
          <input
            type="text"
            className={cn(
              'w-full rounded-lg border border-sdk-brand-foreground/20 bg-sdk-brand-foreground/10 px-3 py-2 text-sm',
              'text-sdk-brand-foreground placeholder:text-sdk-brand-foreground/50',
              'outline-none',
            )}
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}
    </div>
  );
});

ResourceCenterHeader.displayName = 'ResourceCenterHeader';
