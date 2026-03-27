import { forwardRef, memo, useCallback, type HTMLAttributes } from 'react';
import { DropDownIcon } from '@usertour-packages/icons';
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
    'size-6 rounded',
    'inline-flex items-center justify-center',
    'text-sdk-resource-center-header-foreground',
    'hover:bg-sdk-resource-center-header-foreground/10',
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
// Header
// ============================================================================

export const ResourceCenterHeader = memo(({ text }: { text: string }) => {
  return (
    <div className="usertour-widget-resource-center-header bg-sdk-resource-center-header-background shrink-0">
      <div className="usertour-widget-resource-center-header-content px-3 py-2 flex items-center">
        <div className="text-sdk-resource-center-header-foreground font-semibold text-base flex-1">
          {text}
        </div>
        <ResourceCenterCloseButton />
      </div>
    </div>
  );
});

ResourceCenterHeader.displayName = 'ResourceCenterHeader';
