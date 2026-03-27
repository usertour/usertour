import { memo } from 'react';
import { UsertourIcon } from '@usertour-packages/icons';
import { useResourceCenterContext } from './context';

export const ResourceCenterFooter = memo(() => {
  const { showMadeWith } = useResourceCenterContext();
  if (!showMadeWith) return null;
  return (
    <div className="usertour-widget-resource-center-footer bg-sdk-background">
      <div className="usertour-widget-resource-center-footer-content text-xs opacity-50 hover:opacity-75">
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
    </div>
  );
});

ResourceCenterFooter.displayName = 'ResourceCenterFooter';
