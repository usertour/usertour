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
  /** Card-stack pages opt into the muted surface so their cards float. */
  surface?: 'default' | 'muted';
}

const navItems: NavItem[] = [
  {
    titleKey: 'admin.nav.general',
    href: '/admin/general',
    icon: RiSettings2Line,
    surface: 'muted',
  },
  {
    titleKey: 'admin.nav.authentication',
    href: '/admin/authentication',
    icon: KeyIcon,
    surface: 'muted',
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

// The admin layout reads this to give card-stack pages the muted surface (so
// their soft-shadow cards float), the same way the project settings layout
// derives surface from the section registry.
export const getAdminSurface = (pathname: string): 'default' | 'muted' =>
  navItems.find((item) => pathname.startsWith(item.href))?.surface ?? 'default';

export const AdminPanelSidebarNav = () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <AdminSidebarContainerTemplate>
      <AdminSidebarHeaderTemplate>
        <h2 className="text-lg font-medium">{t('admin.nav.title')}</h2>
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
