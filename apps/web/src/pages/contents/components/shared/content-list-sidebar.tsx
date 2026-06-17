import AdminSidebarFooter from '@/components/admin-sidebar/admin-sidebar-footer';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/admin-sidebar/admin-sidebar-template';
import { RiEditLine, BaseStationLineIcon } from '@usertour/icons';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

interface ContentListSidebarProps {
  title: string;
}

export function ContentListSidebar({ title }: ContentListSidebarProps) {
  const { t } = useTranslation();
  // `published` is single-sourced from the URL. The list hook reads
  // the same URL param to build its query, so the highlighted item
  // and the fetched data can't diverge.
  const [searchParams, setSearchParams] = useSearchParams();
  const isPublished = searchParams.get('published') === '1';

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
        <h2 className="min-w-0 truncate text-lg font-semibold">{title}</h2>
      </AdminSidebarHeaderTemplate>
      <AdminSidebarBodyTemplate>
        <AdminSidebarBodyTitleTemplate>
          {t('contents.shared.sidebar.status')}
        </AdminSidebarBodyTitleTemplate>
        <AdminSidebarBodyItemTemplate
          onClick={handleStatusChange(false)}
          variant={!isPublished ? 'secondary' : 'ghost'}
          className={getItemClassName(!isPublished)}
        >
          <RiEditLine className="w-4 h-4 mr-1" />
          {t('contents.shared.sidebar.draft')}
        </AdminSidebarBodyItemTemplate>
        <AdminSidebarBodyItemTemplate
          onClick={handleStatusChange(true)}
          variant={isPublished ? 'secondary' : 'ghost'}
          className={getItemClassName(isPublished)}
        >
          <BaseStationLineIcon className="w-4 h-4 mr-1" />
          {t('contents.shared.sidebar.published')}
        </AdminSidebarBodyItemTemplate>
      </AdminSidebarBodyTemplate>
      <AdminSidebarFooter />
    </AdminSidebarContainerTemplate>
  );
}

ContentListSidebar.displayName = 'ContentListSidebar';
