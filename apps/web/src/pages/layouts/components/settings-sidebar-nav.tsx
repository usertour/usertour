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
  ProjectIcon,
  // PlugIcon,
  KeyIcon,
} from '@usertour-packages/icons';
import { TeamMemberRole } from '@usertour/types';
import { useLocation, useNavigate } from 'react-router-dom';

// Constants
const ALL_ROLES = [TeamMemberRole.ADMIN, TeamMemberRole.OWNER, TeamMemberRole.VIEWER] as const;
const OWNER_ROLES = [TeamMemberRole.OWNER] as const;
// const ADMIN_ROLES = [TeamMemberRole.ADMIN, TeamMemberRole.OWNER] as const;
const ICON_CLASS_NAME = 'w-4 h-4';

enum Mode {
  CLOUD = 'cloud',
  SELF_HOSTED = 'self-hosted',
}

// Types
enum SidebarNavItemType {
  GENERAL = 'general',
  DEVELOPER = 'developer',
}

interface SidebarNavItem {
  title: string;
  href: string;
  role: readonly TeamMemberRole[];
  type: SidebarNavItemType;
  icon: React.ReactNode;
  mode: Mode[];
}

// Components
interface NavItemProps {
  item: SidebarNavItem;
  isActive: boolean;
  onClick: () => void;
}

const NavItem = ({ item, isActive, onClick }: NavItemProps) => (
  <AdminSidebarBodyItemTemplate
    onClick={onClick}
    variant={isActive ? 'secondary' : 'ghost'}
    className={`w-full justify-start gap-1 ${
      isActive ? 'bg-gray-200/40 dark:bg-secondary/60' : ''
    }`}
  >
    {item.icon}
    {item.title}
  </AdminSidebarBodyItemTemplate>
);

interface NavSectionProps {
  title: string;
  items: SidebarNavItem[];
  currentPath: string;
  onNavigate: (href: string) => void;
}

const NavSection = ({ title, items, currentPath, onNavigate }: NavSectionProps) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <AdminSidebarBodyTitleTemplate>{title}</AdminSidebarBodyTitleTemplate>
      {items.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          isActive={currentPath.startsWith(item.href)}
          onClick={() => onNavigate(item.href)}
        />
      ))}
    </>
  );
};

// Data
const sidebarNavItems: readonly SidebarNavItem[] = [
  {
    title: 'Company',
    href: '/settings/companies',
    role: OWNER_ROLES,
    type: SidebarNavItemType.GENERAL,
    icon: <ProjectIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  {
    title: 'Themes',
    href: '/settings/themes',
    role: ALL_ROLES,
    type: SidebarNavItemType.GENERAL,
    icon: <ColorIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  {
    title: 'Environments',
    href: '/settings/environments',
    role: ALL_ROLES,
    type: SidebarNavItemType.GENERAL,
    icon: <BoxIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  {
    title: 'Attributes',
    href: '/settings/attributes',
    role: ALL_ROLES,
    type: SidebarNavItemType.GENERAL,
    icon: <AttributeIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  {
    title: 'Events',
    href: '/settings/events',
    role: ALL_ROLES,
    type: SidebarNavItemType.GENERAL,
    icon: <FlashlightIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  {
    title: 'Team',
    href: '/settings/team',
    role: OWNER_ROLES,
    type: SidebarNavItemType.GENERAL,
    icon: <TeamIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  {
    title: 'Billing',
    href: '/settings/billing',
    role: OWNER_ROLES,
    type: SidebarNavItemType.GENERAL,
    icon: <BankCardIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD],
  },
  {
    title: 'Subscription',
    href: '/settings/subscription',
    role: OWNER_ROLES,
    type: SidebarNavItemType.GENERAL,
    icon: <BankCardIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.SELF_HOSTED],
  },
  {
    title: 'Account',
    href: '/settings/account',
    role: ALL_ROLES,
    type: SidebarNavItemType.GENERAL,
    icon: <AccountIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  {
    title: 'API',
    href: '/settings/api',
    role: OWNER_ROLES,
    type: SidebarNavItemType.DEVELOPER,
    icon: <KeyIcon className={ICON_CLASS_NAME} />,
    mode: [Mode.CLOUD, Mode.SELF_HOSTED],
  },
  // {
  //   title: 'Integrations',
  //   href: '/settings/integrations',
  //   role: OWNER_ROLES,
  //   type: SidebarNavItemType.DEVELOPER,
  //   icon: <PlugIcon className={ICON_CLASS_NAME} />,
  // },
  // {
  //   title: 'Webhooks',
  //   href: '/settings/webhooks',
  //   role: ADMIN_ROLES,
  //   type: SidebarNavItemType.DEVELOPER,
  //   icon: <Webhook className={ICON_CLASS_NAME} />,
  // },
] as const;

export const SettingsSidebarNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { project, globalConfig } = useAppContext();

  const isSelfHosted = globalConfig?.isSelfHostedMode;

  const filteredItems = sidebarNavItems
    .map((item) => ({
      ...item,
      href: `/project/${project?.id}${item.href}`,
    }))
    .filter((item) => {
      const projectRole = project?.role;
      return projectRole && item.role.includes(projectRole as TeamMemberRole);
    });

  const generalItems = filteredItems.filter(
    (item) =>
      item.type === SidebarNavItemType.GENERAL &&
      item.mode.includes(isSelfHosted ? Mode.SELF_HOSTED : Mode.CLOUD),
  );
  const developerItems = filteredItems.filter((item) => item.type === SidebarNavItemType.DEVELOPER);

  const handleNavigate = (href: string) => {
    navigate(href);
  };

  return (
    <AdminSidebarContainerTemplate>
      <AdminSidebarHeaderTemplate>
        <h2 className="text-lg font-semibold">Settings</h2>
      </AdminSidebarHeaderTemplate>
      <AdminSidebarBodyTemplate>
        <NavSection
          title="General"
          items={generalItems}
          currentPath={location.pathname}
          onNavigate={handleNavigate}
        />
        <div className="h-2" />
        <NavSection
          title="Advanced"
          items={developerItems}
          currentPath={location.pathname}
          onNavigate={handleNavigate}
        />
      </AdminSidebarBodyTemplate>
      <AdminSidebarFooter />
    </AdminSidebarContainerTemplate>
  );
};

SettingsSidebarNav.displayName = 'SettingsSidebarNav';
