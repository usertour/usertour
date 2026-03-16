import { useLocation } from 'react-router-dom';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/templates/admin-sidebar-template';
import { SettingsIcon, GroupIcon2, FolderIcon2 } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import { Link } from 'react-router-dom';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    title: 'Subscription',
    href: '/admin/settings',
    icon: SettingsIcon,
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: GroupIcon2,
  },
  {
    title: 'Projects',
    href: '/admin/projects',
    icon: FolderIcon2,
  },
];

export const AdminPanelSidebarNav = () => {
  const location = useLocation();

  return (
    <AdminSidebarContainerTemplate>
      <AdminSidebarHeaderTemplate>System Admin</AdminSidebarHeaderTemplate>
      <AdminSidebarBodyTemplate>
        <AdminSidebarBodyTitleTemplate>Management</AdminSidebarBodyTitleTemplate>
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
                {item.title}
              </AdminSidebarBodyItemTemplate>
            </Link>
          );
        })}
      </AdminSidebarBodyTemplate>
    </AdminSidebarContainerTemplate>
  );
};

AdminPanelSidebarNav.displayName = 'AdminPanelSidebarNav';
