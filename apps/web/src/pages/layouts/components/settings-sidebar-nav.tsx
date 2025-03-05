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
import { TeamMemberRole } from '@usertour-ui/types';
import { useLocation, useNavigate } from 'react-router-dom';

const allRoles = [TeamMemberRole.ADMIN, TeamMemberRole.OWNER, TeamMemberRole.VIEWER];
const ownerRoles = [TeamMemberRole.OWNER];

const sidebarNavItems = [
  {
    title: 'Themes',
    href: '/settings/themes',
    role: allRoles,
  },
  {
    title: 'Environments',
    href: '/settings/environments',
    role: allRoles,
  },
  // {
  //   title: "Localization",
  //   href: "/settings/localizations",
  // },
  {
    title: 'Attributes',
    href: '/settings/attributes',
    role: allRoles,
  },
  {
    title: 'Events',
    href: '/settings/events',
    role: allRoles,
  },
  {
    title: 'Team',
    href: '/settings/team',
    role: ownerRoles,
  },
  {
    title: 'Account',
    href: '/settings/account',
    role: allRoles,
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
            className={`w-full justify-start ${
              location.pathname === item.href ? 'bg-gray-200/40 dark:bg-secondary/60  ' : ''
            }`}
          >
            {item.title}
          </AdminSidebarBodyItemTemplate>
        ))}
      </AdminSidebarBodyTemplate>
      <AdminSidebarFooter />
    </AdminSidebarContainerTemplate>
  );
};

SettingsSidebarNav.displayName = 'SettingsSidebarNav';
