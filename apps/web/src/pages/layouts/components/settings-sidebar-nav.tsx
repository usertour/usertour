'use client';

import AdminSidebarFooter from '@/components/molecules/admin-sidebar-footer';
import {
  AdminSidebarBodyItemTemplate,
  AdminSidebarBodyTemplate,
  AdminSidebarBodyTitleTemplate,
  AdminSidebarContainerTemplate,
  AdminSidebarHeaderTemplate,
} from '@/components/templates/admin-sidebar-template';
import { useAppContext } from '@/contexts/app-context';
import {
  ColorIcon,
  BoxIcon,
  AttributeIcon,
  TeamIcon,
  AccountIcon,
  FlashlightIcon,
  BankCardIcon,
} from '@usertour-ui/icons';
import { TeamMemberRole } from '@usertour-ui/types';
import { useLocation, useNavigate } from 'react-router-dom';

const allRoles = [TeamMemberRole.ADMIN, TeamMemberRole.OWNER, TeamMemberRole.VIEWER];
const ownerRoles = [TeamMemberRole.OWNER];

const iconClassName = 'w-4 h-4 ';

const sidebarNavItems = [
  {
    title: 'Themes',
    href: '/settings/themes',
    role: allRoles,
    icon: <ColorIcon className={iconClassName} />,
  },
  {
    title: 'Environments',
    href: '/settings/environments',
    role: allRoles,
    icon: <BoxIcon className={iconClassName} />,
  },
  // {
  //   title: "Localization",
  //   href: "/settings/localizations",
  // },
  {
    title: 'Attributes',
    href: '/settings/attributes',
    role: allRoles,
    icon: <AttributeIcon className={iconClassName} />,
  },
  {
    title: 'Events',
    href: '/settings/events',
    role: allRoles,
    icon: <FlashlightIcon className={iconClassName} />,
  },
  {
    title: 'Team',
    href: '/settings/team',
    role: ownerRoles,
    icon: <TeamIcon className={iconClassName} />,
  },
  {
    title: 'Billing',
    href: '/settings/billing',
    role: ownerRoles,
    icon: <BankCardIcon className={iconClassName} />,
  },
  {
    title: 'Account',
    href: '/settings/account',
    role: allRoles,
    icon: <AccountIcon className={iconClassName} />,
  },
];

export const SettingsSidebarNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { project } = useAppContext();
  const items = sidebarNavItems
    .map((it) => {
      const href = `/project/${project?.id}${it.href}`;
      return { ...it, href };
    })
    .filter((it) => {
      const projectRole = project?.role;
      if (projectRole && it.role.includes(projectRole as TeamMemberRole)) {
        return true;
      }
      return false;
    });

  return (
    <AdminSidebarContainerTemplate>
      <AdminSidebarHeaderTemplate>
        <h2 className="text-lg font-semibold ">Project Settings</h2>
      </AdminSidebarHeaderTemplate>
      <AdminSidebarBodyTemplate>
        <AdminSidebarBodyTitleTemplate>General</AdminSidebarBodyTitleTemplate>
        {items.map((item) => (
          <AdminSidebarBodyItemTemplate
            key={item.href}
            onClick={() => {
              navigate(item.href);
            }}
            variant={location.pathname === item.href ? 'secondary' : 'ghost'}
            className={`w-full justify-start  gap-1 ${
              location.pathname === item.href ? 'bg-gray-200/40 dark:bg-secondary/60  ' : ''
            }`}
          >
            {item.icon}
            {item.title}
          </AdminSidebarBodyItemTemplate>
        ))}
      </AdminSidebarBodyTemplate>
      <AdminSidebarFooter />
    </AdminSidebarContainerTemplate>
  );
};

SettingsSidebarNav.displayName = 'SettingsSidebarNav';
