import { useLocation } from 'react-router-dom';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/templates/admin-sidebar-template';
import { BankCardIcon, RiGroupLine, RiProjectorLine } from '@usertour-packages/icons';
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
    href: '/admin/subscription',
    icon: BankCardIcon,
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: RiGroupLine,
  },
  {
    title: 'Projects',
    href: '/admin/projects',
    icon: RiProjectorLine,
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
