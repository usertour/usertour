import { forwardRef, memo, useCallback, type HTMLAttributes } from 'react';
import { ArrowLeftIcon, DropDownIcon } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
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
// Home Header — rendered inside Body so it scrolls with content
// ============================================================================

export const ResourceCenterHomeHeader = memo(() => {
  const { data } = useResourceCenterContext();

  return (
    <div className="p-2 flex items-center bg-sdk-resource-center-primary rounded-t-[inherit]">
      <div className="text-sdk-resource-center-header-foreground flex-1 pl-4 text-lg">
        {data.headerText}
      </div>
      <ResourceCenterCloseButton />
    </div>
  );
});

ResourceCenterHomeHeader.displayName = 'ResourceCenterHomeHeader';

// ============================================================================
// Header — renders on non-Home pages (tab pages, detail pages)
// ============================================================================

export const ResourceCenterHeader = memo(() => {
  const { data, showBackButton, currentPage, autoExpandedPage, currentTab, nav, userAttributes } =
    useResourceCenterContext();

  // On Home tab with no detail/auto-expanded page → no header (HomeHeader is inside Body)
  const isHomePage =
    !showBackButton && !autoExpandedPage && nav.activeTabId === (data.tabs[0]?.id ?? '');
  if (isHomePage) return null;

  // Determine header title: pushed page > auto-expanded page > tab name > fallback
  const title = currentPage
    ? serializeBlockName(currentPage.block.name, userAttributes)
    : autoExpandedPage
      ? serializeBlockName(autoExpandedPage.block.name, userAttributes)
      : (currentTab?.name ?? data.headerText);

  return (
    <div
      className={cn(
        'order-1 shrink-0 p-2 flex items-center bg-sdk-resource-center-primary rounded-t-[inherit]',
        'group-data-[animate-frame=true]:transition-opacity',
        'group-data-[animate-frame=true]:duration-sdk-resource-center',
        'group-data-[state=closed]:absolute group-data-[state=closed]:invisible group-data-[state=closed]:opacity-0',
      )}
    >
      {showBackButton && <ResourceCenterBackButton />}
      {!showBackButton && (
        <div className="text-sdk-resource-center-header-foreground flex-1 pl-4 text-lg">
          {title}
        </div>
      )}
      {showBackButton && <div className="flex-1" />}
      <ResourceCenterCloseButton />
    </div>
  );
});

ResourceCenterHeader.displayName = 'ResourceCenterHeader';
