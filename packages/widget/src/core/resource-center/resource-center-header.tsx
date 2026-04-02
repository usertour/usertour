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
    'rounded-lg inline-flex items-center justify-center',
    'text-sdk-resource-center-header-foreground',
    'hover:bg-sdk-resource-center-header-foreground/10',
    'outline-none cursor-pointer p-2',
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
        'rounded-lg inline-flex items-center justify-center',
        'text-sdk-resource-center-header-foreground',
        'hover:bg-sdk-resource-center-header-foreground/10',
        'outline-none cursor-pointer p-2',
      )}
      onClick={handleClick}
      aria-label="Back"
    >
      <ArrowLeftIcon height={20} width={20} />
    </Button>
  );
});

ResourceCenterBackButton.displayName = 'ResourceCenterBackButton';

// ============================================================================
// Header
// ============================================================================

export const ResourceCenterHeader = memo(({ text }: { text: string }) => {
  const { activeSubPage, activeKnowledgeBase, activeContactPage } = useResourceCenterContext();
  const isSecondaryPage = activeSubPage || activeKnowledgeBase || activeContactPage;
  const headerText = activeSubPage
    ? activeSubPage.name || 'Sub-page'
    : activeKnowledgeBase
      ? activeKnowledgeBase.name || 'Knowledge base'
      : activeContactPage
        ? activeContactPage.page === 'email'
          ? 'Email'
          : 'Phone'
        : text;

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
      <div className="text-sdk-resource-center-header-foreground flex-1 pl-4 text-lg">
        {headerText}
      </div>
      <ResourceCenterCloseButton />
    </div>
  );
});

ResourceCenterHeader.displayName = 'ResourceCenterHeader';
