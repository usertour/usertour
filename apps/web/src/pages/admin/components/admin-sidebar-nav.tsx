import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/admin-sidebar/admin-sidebar-template';
import {
  BankCardIcon,
  GroupLineIcon,
  KeyIcon,
  ProjectIcon,
  RiSettings2Line,
} from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import { Link } from 'react-router-dom';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    titleKey: 'admin.nav.general',
    href: '/admin/general',
    icon: RiSettings2Line,
  },
  {
    titleKey: 'admin.nav.authentication',
    href: '/admin/authentication',
    icon: KeyIcon,
  },
  {
    titleKey: 'admin.nav.subscription',
    href: '/admin/subscription',
    icon: BankCardIcon,
  },
  {
    titleKey: 'admin.nav.users',
    href: '/admin/users',
    icon: GroupLineIcon,
  },
  {
    titleKey: 'admin.nav.projects',
    href: '/admin/projects',
    icon: ProjectIcon,
  },
];

export const AdminPanelSidebarNav = () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <AdminSidebarContainerTemplate>
      <AdminSidebarHeaderTemplate>
        <h2 className="text-lg font-semibold">{t('admin.nav.title')}</h2>
      </AdminSidebarHeaderTemplate>
      <AdminSidebarBodyTemplate>
        <AdminSidebarBodyTitleTemplate>{t('admin.nav.sectionLabel')}</AdminSidebarBodyTitleTemplate>
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          return (
            <Link to={item.href} key={item.href}>
              <AdminSidebarBodyItemTemplate
                className={cn(
                  isActive &&
                    'bg-gray-200/60 dark:bg-secondary/80 !text-foreground dark:!text-dark-accent-foreground',
                )}
              >
                <Icon className="w-4 h-4 mr-2" />
                {t(item.titleKey)}
              </AdminSidebarBodyItemTemplate>
            </Link>
          );
        })}
      </AdminSidebarBodyTemplate>
    </AdminSidebarContainerTemplate>
  );
};

AdminPanelSidebarNav.displayName = 'AdminPanelSidebarNav';
