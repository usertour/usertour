// Grid item component for content type selection

import { memo } from 'react';

export interface ContentTypeGridItemProps {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

export const ContentTypeGridItem = memo(
  ({ name, icon: Icon, onClick }: ContentTypeGridItemProps) => (
    <div
      onClick={onClick}
      className="rounded-lg text-sm flex flex-col border hover:shadow-lg dark:hover:shadow-lg-light cursor-pointer p-4 items-center justify-center pb-2"
    >
      <Icon className="h-6 w-6 text-primary" />
      {name}
    </div>
  ),
);

ContentTypeGridItem.displayName = 'ContentTypeGridItem';
