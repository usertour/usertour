import AdminSidebarFooter from '@/components/molecules/admin-sidebar-footer';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/templates/admin-sidebar-template';
import { useContentListContext } from '@/contexts/content-list-context';
import { FileEditLineIcon, BaseStationLineIcon } from '@usertour-ui/icons';
import { useParams, useSearchParams } from 'react-router-dom';

export function ContentListSidebar() {
  const { query, setQuery } = useContentListContext();
  const { contentType } = useParams();
  const [_, setSearchParams] = useSearchParams();

  // Extract common styles and logic
  const getItemClassName = (isActive: boolean) =>
    isActive ? 'bg-gray-200/40 dark:bg-secondary/60' : '';

  const handleStatusChange = (published: boolean) => () => {
    setQuery({ published });
    setSearchParams({});
  };

  return (
    <AdminSidebarContainerTemplate>
      <AdminSidebarHeaderTemplate>
        <h2 className="text-2xl font-semibold">
          {contentType === 'flows' && 'Flows'}
          {contentType === 'launchers' && 'Launchers'}
          {contentType === 'checklists' && 'Checklists'}
          {contentType === 'nps' && 'NPS'}
        </h2>
      </AdminSidebarHeaderTemplate>
      <AdminSidebarBodyTemplate>
        <AdminSidebarBodyTitleTemplate>Status</AdminSidebarBodyTitleTemplate>
        <AdminSidebarBodyItemTemplate
          onClick={handleStatusChange(false)}
          variant={query.published === false ? 'secondary' : 'ghost'}
          className={getItemClassName(query.published === false)}
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
