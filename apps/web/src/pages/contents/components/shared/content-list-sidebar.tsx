import AdminSidebarFooter from '@/components/molecules/admin-sidebar-footer';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/templates/admin-sidebar-template';
import { useContentListContext } from '@/contexts/content-list-context';
import { FileEditLineIcon, BaseStationLineIcon } from '@usertour-packages/icons';
import { useSearchParams } from 'react-router-dom';

interface ContentListSidebarProps {
  title: string;
}

export function ContentListSidebar({ title }: ContentListSidebarProps) {
  const { query } = useContentListContext();
  const [, setSearchParams] = useSearchParams();

  // Extract common styles and logic
  const getItemClassName = (isActive: boolean) =>
    isActive ? 'bg-gray-200/40 dark:bg-secondary/60' : '';

  const handleStatusChange = (published: boolean) => () => {
    // Update URL as the single source of truth, creating a history entry
    setSearchParams({ published: published ? '1' : '0' }, { replace: false });
  };

  return (
    <AdminSidebarContainerTemplate>
      <AdminSidebarHeaderTemplate>
        <h2 className="text-2xl font-semibold">{title}</h2>
      </AdminSidebarHeaderTemplate>
      <AdminSidebarBodyTemplate>
        <AdminSidebarBodyTitleTemplate>Status</AdminSidebarBodyTitleTemplate>
        <AdminSidebarBodyItemTemplate
          onClick={handleStatusChange(false)}
          variant={query.published !== true ? 'secondary' : 'ghost'}
          className={getItemClassName(query.published !== true)}
        >
          <FileEditLineIcon className="w-4 h-4 mr-1" />
          Draft
        </AdminSidebarBodyItemTemplate>
        <AdminSidebarBodyItemTemplate
          onClick={handleStatusChange(true)}
          variant={query.published === true ? 'secondary' : 'ghost'}
          className={getItemClassName(query.published === true)}
        >
          <BaseStationLineIcon className="w-4 h-4 mr-1" />
          Published
        </AdminSidebarBodyItemTemplate>
      </AdminSidebarBodyTemplate>
      <AdminSidebarFooter />
    </AdminSidebarContainerTemplate>
  );
}

ContentListSidebar.displayName = 'ContentListSidebar';
