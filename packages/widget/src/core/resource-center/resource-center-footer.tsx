import { memo } from 'react';
import { UsertourIcon } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import { useResourceCenterContext } from './context';

export const ResourceCenterFooter = memo(() => {
  const { showMadeWith } = useResourceCenterContext();
  if (!showMadeWith) return null;

  return (
    <div
      className={cn(
        'order-3 shrink-0 bg-sdk-background text-xs opacity-50 hover:opacity-75 pl-2 py-1',
        'group-data-[animate-frame=true]:transition-opacity',
        'group-data-[animate-frame=true]:duration-sdk-resource-center',
        'group-data-[state=closed]:absolute group-data-[state=closed]:invisible group-data-[state=closed]:opacity-0',
      )}
    >
      <a
        href="https://www.usertour.io?utm_source=made-with-usertour&utm_medium=link&utm_campaign=made-with-usertour-widget"
        className="!text-sdk-foreground !no-underline flex flex-row space-x-0.5 items-center !font-sans"
        target="_blank"
        rel="noopener noreferrer"
      >
        <UsertourIcon width={14} height={14} />
        <span>Made with Usertour</span>
      </a>
    </div>
  );
});

ResourceCenterFooter.displayName = 'ResourceCenterFooter';
